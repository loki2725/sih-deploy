import { Appointment } from "../models/Appointment.js";
import { User } from "../models/User.js";
import { sendAppointmentConfirmationEmail } from "../utils/sendEmail.js";

const CLEANUP_AFTER_HOURS = 24;

const cleanupOldClosedAppointments = async () => {
  const cutoff = new Date(Date.now() - CLEANUP_AFTER_HOURS * 60 * 60 * 1000);

  try {
    await Appointment.deleteMany({
      status: { $in: ["declined", "cancelled"] },
      respondedAt: { $lte: cutoff },
    });
  } catch (error) {
    console.error("Failed to clean up old appointments:", error.message);
  }
};

export const requestAppointment = async (req, res, next) => {
  try {
    const { doctorId, note } = req.body;
    if (!doctorId) return res.status(400).json({ error: "doctorId is required" });

    const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
    if (!doctor) return res.status(404).json({ error: "Doctor not found" });

    const appointment = await Appointment.create({
      patientId: req.user.id,
      doctorId,
      note: note || "",
    });

    res.status(201).json(appointment);
  } catch (error) {
    next(error);
  }
};

export const getMyAppointments = async (req, res, next) => {
  try {
    await cleanupOldClosedAppointments();

    const appointments = await Appointment.find({ patientId: req.user.id })
      .populate("doctorId", "name email")
      .sort({ requestedAt: -1 });

    res.status(200).json(appointments);
  } catch (error) {
    next(error);
  }
};

export const getDoctorAppointments = async (req, res, next) => {
  try {
    await cleanupOldClosedAppointments();

    const appointments = await Appointment.find({ doctorId: req.user.id })
      .populate("patientId", "name email")
      .sort({ requestedAt: -1 });

    res.status(200).json(appointments);
  } catch (error) {
    next(error);
  }
};

export const scheduleAppointment = async (req, res, next) => {
  try {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: "date is required" });

    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user.id,
    }).populate("patientId", "name email");

    if (!appointment) return res.status(404).json({ error: "Appointment not found" });

    const scheduledDate = new Date(date);
    if (Number.isNaN(scheduledDate.getTime())) {
      return res.status(400).json({ error: "Invalid appointment date" });
    }

    appointment.status = "scheduled";
    appointment.scheduledDate = scheduledDate;
    appointment.respondedAt = new Date();
    await appointment.save();

    const doctor = await User.findById(req.user.id).select("name");

    try {
      await sendAppointmentConfirmationEmail(appointment.patientId.email, {
        patientName: appointment.patientId.name,
        doctorName: doctor?.name || "your physician",
        scheduledDate: appointment.scheduledDate,
      });
    } catch (mailError) {
      console.error("Failed to send appointment confirmation email:", mailError.message);
    }

    res.status(200).json(appointment);
  } catch (error) {
    next(error);
  }
};

export const declineAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      doctorId: req.user.id,
    });

    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    if (["declined", "cancelled"].includes(appointment.status)) {
      return res.status(400).json({ error: "This appointment is already closed." });
    }

    appointment.status = "declined";
    appointment.respondedAt = new Date();
    await appointment.save();
    res.status(200).json(appointment);
  } catch (error) {
    next(error);
  }
};

export const cancelAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      patientId: req.user.id,
    });

    if (!appointment) return res.status(404).json({ error: "Appointment not found" });
    if (["declined", "cancelled"].includes(appointment.status)) {
      return res.status(400).json({ error: "This appointment is already closed." });
    }

    appointment.status = "cancelled";
    appointment.respondedAt = new Date();
    await appointment.save();
    res.status(200).json(appointment);
  } catch (error) {
    next(error);
  }
};
