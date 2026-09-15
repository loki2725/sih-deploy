import { useState } from "react";
import { ChevronLeft, Eye, Volume2, Check } from "lucide-react";
import { T } from "@/models/constant.js";
import {
  Card,
  ProgressDots,
  Field,
  Select,
  YesNo,
  Button,
} from "@/views/components/common/Primitive.jsx";

export function Onboarding({ patient, setPatient, onDone }) {
  const [step, setStep] = useState(1);
  const next = () => (step < 3 ? setStep(step + 1) : onDone());
  const back = () => step > 1 && setStep(step - 1);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ background: T.canvas }}
    >
      <div className="w-full max-w-md">
        <Card>
          <ProgressDots step={step} total={3} />
          {step > 1 && (
            <button
              onClick={back}
              className="flex items-center gap-1 text-xs mb-3"
              style={{ color: T.inkSoft }}
            >
              <ChevronLeft size={14} /> Back
            </button>
          )}

          {step === 1 && (
            <>
              <h2
                className="text-lg font-semibold mb-1"
                style={{ color: T.ink }}
              >
                Let's know you better
              </h2>
              <p className="text-sm mb-5" style={{ color: T.inkSoft }}>
                This helps us personalize your experience
              </p>
              <Field
                label="Name"
                value={patient.name}
                onChange={(e) =>
                  setPatient({ ...patient, name: e.target.value })
                }
              />
              <Field
                label="Age"
                value={patient.age}
                onChange={(e) =>
                  setPatient({ ...patient, age: e.target.value })
                }
              />
              <Select
                label="Language"
                value={patient.language}
                options={["English", "Hindi", "Assamese"]}
                onChange={(e) =>
                  setPatient({ ...patient, language: e.target.value })
                }
              />
              <Field
                label="Location"
                value={patient.location}
                onChange={(e) =>
                  setPatient({ ...patient, location: e.target.value })
                }
              />
            </>
          )}

          {step === 2 && (
            <>
              <h2
                className="text-lg font-semibold mb-1"
                style={{ color: T.ink }}
              >
                Health & Cognitive Profile
              </h2>
              <p className="text-sm mb-5" style={{ color: T.inkSoft }}>
                Please answer a few questions
              </p>
              <YesNo
                label="Diagnosed with Dementia?"
                value={patient.dementia}
                onChange={(v) => setPatient({ ...patient, dementia: v })}
              />
              <YesNo
                label="Experiencing memory related symptoms?"
                value={patient.memorySymptoms}
                onChange={(v) => setPatient({ ...patient, memorySymptoms: v })}
              />
              <YesNo
                label="Any other chronic condition?"
                value={patient.chronicCondition}
                onChange={(v) =>
                  setPatient({ ...patient, chronicCondition: v })
                }
              />
            </>
          )}

          {step === 3 && (
            <>
              <h2
                className="text-lg font-semibold mb-1"
                style={{ color: T.ink }}
              >
                Accessibility
              </h2>
              <p className="text-sm mb-5" style={{ color: T.inkSoft }}>
                We'll adapt the app as per your needs
              </p>
              <YesNo
                label="Visual impairment?"
                value={patient.visualImpairment}
                onChange={(v) =>
                  setPatient({ ...patient, visualImpairment: v })
                }
              />
              <YesNo
                label="Auditory impairment?"
                value={patient.auditoryImpairment}
                onChange={(v) =>
                  setPatient({ ...patient, auditoryImpairment: v })
                }
              />
              <div className="mb-2">
                <span
                  className="block text-xs font-medium mb-1.5"
                  style={{ color: T.inkSoft }}
                >
                  Preferred mode
                </span>
                <div className="flex gap-2">
                  {[
                    { k: "Visual", icon: Eye },
                    { k: "Audio", icon: Volume2 },
                    { k: "Both", icon: Check },
                  ].map(({ k, icon: Icon }) => (
                    <button
                      key={k}
                      onClick={() =>
                        setPatient({ ...patient, accessibilityMode: k })
                      }
                      className="flex-1 py-3 rounded-lg flex flex-col items-center gap-1 text-xs font-medium"
                      style={{
                        background:
                          patient.accessibilityMode === k
                            ? T.primarySoft
                            : T.canvas,
                        color:
                          patient.accessibilityMode === k
                            ? T.primary
                            : T.inkSoft,
                        border: `1px solid ${patient.accessibilityMode === k ? T.primary : T.line}`,
                      }}
                    >
                      <Icon size={16} /> {k}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          <Button onClick={next} className="w-full mt-4">
            {step < 3 ? "Next" : "Finish Setup"}
          </Button>
        </Card>
      </div>
    </div>
  );
}
