import dynamic from 'next/dynamic';

// The save pill (SaveToastInner.js) uses framer-motion, which fails when the calendar is drawn on the server, so it is loaded in the
// browser only. Until it arrives, an empty space of the same height keeps the footer from jumping.
const SaveToast = dynamic(() => import('./SaveToastInner'), { ssr: false, loading: () => <div className="h-12" aria-hidden="true" /> });

export default SaveToast;
