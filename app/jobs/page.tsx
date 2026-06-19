import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import Sidebar from '../components/layout/Sidebar';
import Header from '../components/layout/Header';
import JobBoardResults from '../components/dashboard/JobBoardResults';
import { auth } from '../lib/auth';
import { getJobBoardJobs } from '../lib/jobs/jobBoard';
import { getUserJornadaSnapshot, isOfficialStudentUser } from '../lib/jornada/service';

export default async function JobsPage() {
    const session = await auth.api.getSession({ headers: await headers() });

    if (!session?.user) {
        redirect('/login');
    }

    const jobs = await getJobBoardJobs();
    const isOfficialStudent = await isOfficialStudentUser(session.user.id);
    const jornadaSnapshot = isOfficialStudent ? await getUserJornadaSnapshot(session.user.id) : null;

    return (
        <div className="min-h-screen flex dark bg-black text-white [font-family:'Ubuntu',Helvetica] antialiased">
            <Sidebar />

            <main className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-hidden bg-black">
                <Header title="Vagas para Você" />

                <div data-onboarding-id="jobs-board" className="flex-1 overflow-visible lg:overflow-auto scrollbar-modern">
                    <div className="w-full px-6 md:px-8 py-10 md:py-14 space-y-12">
                        <section>
                            <span className="text-[11px] font-bold uppercase tracking-[2px] text-[#a78bfa] [font-family:'Ubuntu',Helvetica]">
                                Vagas_
                            </span>
                            <h1 className="mt-4 text-3xl md:text-[40px] font-black text-white leading-[1.1] [font-family:'Ubuntu',Helvetica]">
                                Vagas mais compatíveis com seu conhecimento
                            </h1>
                            <p className="mt-5 text-white/70 text-[16px] leading-relaxed max-w-[60ch] [font-family:'Ubuntu',Helvetica]">
                                Cada vaga vem com o % de compatibilidade calculado sobre as habilidades do seu perfil. Continue avançando no curso e aumente sua compatibilidade.
                            </p>
                        </section>

                        <JobBoardResults
                            jobs={jobs}
                            currentRank={jornadaSnapshot?.currentRankLetter ?? null}
                            isOfficialStudent={isOfficialStudent}
                        />
                    </div>
                </div>
            </main>
        </div>
    );
}
