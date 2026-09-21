import Script from "next/script";

export function GTMScript({ gtmId }: { gtmId: string }) {
  // `lazyOnload` defers the ~290 KiB GTM/GA payload until the browser is idle
  // after load, keeping it off the initial critical path (better LCP / TBT /
  // main-thread time). GTM still fires its page_view once loaded, and contact
  // clicks happen well after idle, so no events are lost in practice.
  return (
    <Script id="gtm-script" strategy="lazyOnload">
      {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${gtmId}');`}
    </Script>
  );
}

export function GTMNoScript({ gtmId }: { gtmId: string }) {
  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
      />
    </noscript>
  );
}
