const steps = [
  { number: 1, label: "Symptôme" },
  { number: 2, label: "Profil" },
  { number: 3, label: "Antécédents" },
  { number: 4, label: "État" },
  { number: 5, label: "Traitements" },
];

export default function StepIndicator({ currentStep }) {
  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div style={{ marginBottom: "2.5rem" }}>
      {/* Progress bar */}
      <div style={{
        height: 4,
        background: "rgba(135,169,107,0.15)",
        borderRadius: 50,
        marginBottom: "1.25rem",
        overflow: "hidden"
      }}>
        <div className="progress-sage" style={{ height: "100%", width: `${progress}%` }} />
      </div>

      {/* Steps */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        {steps.map(({ number, label }) => {
          const isActive = number === currentStep;
          const isCompleted = number < currentStep;
          return (
            <div key={number} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", flex: 1 }}>
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "Inter, sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  transition: "all 0.3s ease",
                  ...(isActive ? {
                    background: "linear-gradient(135deg, #87A96B, #6B8F52)",
                    color: "white",
                    boxShadow: "0 4px 12px rgba(135,169,107,0.4)"
                  } : isCompleted ? {
                    background: "#B8D0A0",
                    color: "#4A7A35"
                  } : {
                    background: "rgba(135,169,107,0.08)",
                    color: "#9AA889",
                    border: "1.5px dashed rgba(135,169,107,0.3)"
                  })
                }}
              >
                {isCompleted ? "✓" : number}
              </div>
              <span style={{
                fontFamily: "Inter, sans-serif",
                fontSize: "0.7rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "#6B8F52" : isCompleted ? "#87A96B" : "#B0A898",
                textAlign: "center"
              }}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}