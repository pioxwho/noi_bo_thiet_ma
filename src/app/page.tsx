import Logo from "@/components/Logo";
import TeamSplitter from "@/components/TeamSplitterClient";

export default function Home() {
  return (
    <main className="flex-1 px-4 py-6 sm:py-10">
      <header className="anim-fade-up relative mx-auto mb-6 flex min-h-14 max-w-4xl items-center justify-center sm:min-h-20">
        <Logo className="anim-float absolute left-0 top-1/2 -mt-7 h-14 w-14 drop-shadow-[0_6px_14px_rgba(250,204,21,0.35)] sm:-mt-10 sm:h-20 sm:w-20" />
        <h1 className="title-gold text-center text-3xl font-black uppercase tracking-wider sm:text-4xl">
          FC Thiết Mã
        </h1>
      </header>
      <TeamSplitter />
    </main>
  );
}
