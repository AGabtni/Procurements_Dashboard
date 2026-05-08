import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { confirmEmail } from "../api/authApi";

export default function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setErrorMsg("No confirmation token provided.");
      return;
    }

    confirmEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Confirmation failed");
      });
  }, [searchParams]);

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 text-center">
          {status === "loading" && (
            <>
              <div className="spinner-border text-primary mb-3" role="status" />
              <p>Confirming your email...</p>
            </>
          )}
          {status === "success" && (
            <>
              <h2 className="text-success mb-3">Email Confirmed!</h2>
              <p>Your email address has been confirmed. You can now receive notifications.</p>
              <Link to="/settings" className="btn btn-primary">Go to Settings</Link>
            </>
          )}
          {status === "error" && (
            <>
              <h2 className="text-danger mb-3">Confirmation Failed</h2>
              <p>{errorMsg}</p>
              <Link to="/settings" className="btn btn-outline-primary">Go to Settings</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
