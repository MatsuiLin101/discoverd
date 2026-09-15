// Client-side navigation to a route the @modal slot no longer matches keeps the
// last slot content visible unless it resolves to null. This catch-all makes any
// such navigation close the modal.
export default function CatchAll() {
  return null;
}
