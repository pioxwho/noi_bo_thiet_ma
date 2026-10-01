import TeamSplitter from "@/components/TeamSplitterClient";

export default function Home() {
  return (
    <main className="flex-1 px-4 py-6 sm:py-10">
      <h1 className="mb-1 text-center text-2xl font-black uppercase tracking-wider text-yellow-400 sm:text-3xl">
        Chia đội sân 7
      </h1>
      <p className="mb-6 text-center text-xs uppercase tracking-widest text-white/50">
        GK · LB · CB · RB · CM · CAM · ST
      </p>
      <TeamSplitter />
    </main>
  );
}
