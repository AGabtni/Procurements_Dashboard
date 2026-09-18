import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams, Link } from "react-router-dom";
import { confirmEmail } from "../api/authApi";
import { resolveError } from "../utils/resolveError";

export default function ConfirmEmailPage() {
  const { t } = useTranslation("auth");
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
      setErrorMsg(t("confirmEmail.noToken"));
      return;
    }

    confirmEmail(token)
      .then(() => setStatus("success"))
      .catch((err) => {
        setStatus("error");
        setErrorMsg(resolveError(err, t, "confirmEmail.failed"));
      });
  }, [searchParams, t]);

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 text-center">
          {status === "loading" && (
            <>
              <div className="spinner-border text-primary mb-3" role="status" />
              <p>{t("confirmEmail.loading")}</p>
            </>
          )}
          {status === "success" && (
            <>
              <h2 className="text-success mb-3">{t("confirmEmail.successTitle")}</h2>
              <p>{t("confirmEmail.successMessage")}</p>
              <Link to="/settings" className="btn btn-primary">{t("confirmEmail.goToSettings")}</Link>
            </>
          )}
          {status === "error" && (
            <>
              <h2 className="text-danger mb-3">{t("confirmEmail.failedTitle")}</h2>
              <p>{errorMsg}</p>
              <Link to="/settings" className="btn btn-outline-primary">{t("confirmEmail.goToSettings")}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
