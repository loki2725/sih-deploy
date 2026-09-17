import fs from "fs";
import path from "path";
import { MedicalRecord } from "../models/MedicalRecord.js";
import { User } from "../models/User.js";
import cloudinary from "../config/cloudinary.js";
import { getLinkedPatient } from "../utils/authorization.js";

const removeTempFile = (tempPath) => {
  if (tempPath && fs.existsSync(tempPath)) {
    fs.unlink(tempPath, (error) => {
      if (error) console.error("Failed to delete temp file:", error.message);
    });
  }
};

export const uploadRecord = async (req, res, next) => {
  const tempPath = req.file?.path;

  try {
    if (!req.file) return res.status(400).json({ error: "No file was uploaded." });

    const cloudinaryResult = await cloudinary.uploader.upload(tempPath, {
      resource_type: "auto",
      folder: "neuronest/records",
      public_id: `${Date.now()}-${path.parse(req.file.originalname).name}`,
    });

    const record = await MedicalRecord.create({
      patientId: req.user.id,
      originalName: req.file.originalname,
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
    });

    res.status(201).json(record);
  } catch (error) {
    next(error);
  } finally {
    removeTempFile(tempPath);
  }
};

export const getMyRecords = async (req, res, next) => {
  try {
    const records = await MedicalRecord.find({ patientId: req.user.id }).sort({ uploadedAt: -1 });
    res.status(200).json(records);
  } catch (error) {
    next(error);
  }
};

export const getPatientRecords = async (req, res, next) => {
  try {
    const patient = await getLinkedPatient(req.user.id, req.params.patientId);

    if (!patient) {
      return res.status(403).json({ error: "You are not authorized to view this patient's records." });
    }

    const records = await MedicalRecord.find({ patientId: patient._id }).sort({ uploadedAt: -1 });
    res.status(200).json(records);
  } catch (error) {
    next(error);
  }
};

export const downloadRecord = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: "Record not found" });

    const isOwner = record.patientId.toString() === req.user.id;
    let isAuthorizedDoctor = false;

    if (!isOwner && req.user.role === "doctor") {
      const doctor = await User.findById(req.user.id).select("linkedPatients");
      isAuthorizedDoctor = (doctor?.linkedPatients || []).some(
        (id) => id.toString() === record.patientId.toString(),
      );
    }

    if (!isOwner && !isAuthorizedDoctor) {
      return res.status(403).json({ error: "Not authorized to access this file." });
    }

    const cloudinaryResponse = await fetch(record.cloudinaryUrl);
    if (!cloudinaryResponse.ok) {
      return res.status(404).json({ error: "File no longer exists on Cloudinary." });
    }

    const buffer = Buffer.from(await cloudinaryResponse.arrayBuffer());
    res.setHeader("Content-Disposition", `attachment; filename="${record.originalName}"`);
    res.setHeader("Content-Type", record.mimeType || "application/octet-stream");
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
