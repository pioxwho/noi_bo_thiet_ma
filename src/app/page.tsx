import TeamSplitter from "@/components/TeamSplitterClient";

export default function Home() {
  return (
    <main className="flex-1 px-4 py-6 sm:py-10">
      <h1 className="mb-6 text-center text-2xl font-black uppercase tracking-wider text-yellow-400 sm:text-3xl">
        FC Thiết Mã
      </h1>
      <TeamSplitter />
    </main>
  );
}
