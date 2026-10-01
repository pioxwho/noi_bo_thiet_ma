import Logo from "@/components/Logo";
import TeamSplitter from "@/components/TeamSplitterClient";

export default function Home() {
  return (
    <main className="flex-1 px-4 py-6 sm:py-10">
      <header className="relative mb-6 flex min-h-12 items-center justify-center sm:min-h-16">
        <Logo className="absolute left-0 top-1/2 h-12 w-12 -translate-y-1/2 drop-shadow-lg sm:h-16 sm:w-16" />
        <h1 className="text-center text-2xl font-black uppercase tracking-wider text-yellow-400 sm:text-3xl">
          FC Thiết Mã
        </h1>
      </header>
      <TeamSplitter />
    </main>
  );
}
