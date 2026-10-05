// Your account now lives in Settings, as its own tab. The old address still works and leads there.
export const getServerSideProps = () => ({ redirect: { destination: '/settings?tab=account', permanent: false } });

export default function Account() {
  return null;
}
