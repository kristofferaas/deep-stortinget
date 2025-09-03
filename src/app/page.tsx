import HearingCount from './hearing-count';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-2 bg-white">
      <h1 className="text-black font-geist-sans text-sm">Deep Stortinget</h1>
      <HearingCount />
    </div>
  );
}
