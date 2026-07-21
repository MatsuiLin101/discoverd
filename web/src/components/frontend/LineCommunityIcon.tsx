import type { SVGProps } from "react";

/**
 * "Groups" people mark (Material Symbols), representing a community/group.
 * Monochrome via `fill="currentColor"` to match the other social buttons.
 * Used for the "LINE 社群" (LINE community) social link.
 */
export default function LineCommunityIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M12 12.75c1.63 0 3-1.37 3-3s-1.37-3-3-3-3 1.37-3 3 1.37 3 3 3zm-5.5.25c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm11 0c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-11 1.5C4.57 14.5 1 15.62 1 17.75V19h5.5v-1.25c0-.72.19-1.36.5-1.92-.68-.22-1.44-.33-1.5-.33zm11 0c-.06 0-.82.11-1.5.33.31.56.5 1.2.5 1.92V19H23v-1.25c0-2.13-3.57-3.25-5.5-3.25zM12 14c-2.67 0-8 1.34-8 4v1h16v-1c0-2.66-5.33-4-8-4z" />
    </svg>
  );
}
