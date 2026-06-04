interface Props {
  errorMsg?: string | null;
  saveMsg?: string | null;
  successMsg?: string | null;
}

export default function FloatingToast({ errorMsg, saveMsg, successMsg }: Props) {
  if (!errorMsg && !saveMsg && !successMsg) return null;
  return (
    <div className="fixed z-50 flex flex-col gap-2 pointer-events-none top-4 left-1/2 -translate-x-1/2 w-max md:left-[calc(50vw+6rem)] md:w-auto">
      {errorMsg && (
        <div className="px-4 py-2.5 text-sm rounded-lg bg-rose-50 text-rose-600 shadow-lg border border-rose-100">
          {errorMsg}
        </div>
      )}
      {saveMsg && (
        <div className="px-4 py-2.5 text-sm rounded-lg bg-blue-50 text-blue-700 shadow-lg border border-blue-100">
          {saveMsg}
        </div>
      )}
      {successMsg && (
        <div className="px-4 py-2.5 text-sm rounded-lg bg-emerald-50 text-emerald-700 shadow-lg border border-emerald-100">
          {successMsg}
        </div>
      )}
    </div>
  );
}
