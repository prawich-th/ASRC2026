import styles from "@/app/abstracts/abstracts.module.scss";

const steps = [
  "Research",
  "Contributors",
  "Abstract",
  "Review",
] as const;

export const ABSTRACT_FORM_LAST_STEP = steps.length - 1;

export default function AbstractFormStepper({
  currentStep,
  onStepChange,
}: {
  currentStep: number;
  onStepChange: (step: number) => void;
}) {
  return (
    <nav className={styles.stepper} aria-label="Abstract submission progress">
      <ol>
        {steps.map((step, index) => {
          const isCurrent = index === currentStep;
          const isComplete = index < currentStep;
          return (
            <li
              key={step}
              className={isCurrent ? styles.currentStep : isComplete ? styles.completeStep : ""}
            >
              <button
                type="button"
                aria-current={isCurrent ? "step" : undefined}
                disabled={index > currentStep}
                onClick={() => onStepChange(index)}
              >
                <span className={styles.stepNumber} aria-hidden="true">
                  {index + 1}
                </span>
                {step}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
