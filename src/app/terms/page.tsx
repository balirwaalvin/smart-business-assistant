'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLang } from '@/contexts/LangContext';

export default function TermsOfService() {
    const { t, toggleLang, isLuganda } = useLang();

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        {t('backToApp')}
                    </Link>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleLang} className="px-3 py-1 text-xs font-semibold rounded-full border border-gray-300 hover:border-red-500 hover:text-red-600 transition-colors text-gray-600">
                            🌐 {t('switchToLang')}
                        </button>
                        <p className="text-sm font-bold text-black">Tunda Business Assistant</p>
                    </div>
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 md:px-8 py-12">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12">
                    <div className="mb-10 pb-8 border-b border-gray-100">
                        <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">{t('legalDoc')}</div>
                        <h1 className="text-3xl font-bold text-black mb-2">{t('termsOfService')}</h1>
                        <p className="text-gray-500 text-sm">{isLuganda ? 'Okuggyibwa: Marisi 3, 2025' : 'Last updated: March 3, 2025'}</p>
                    </div>
                    {isLuganda ? <TermsLuganda /> : <TermsEnglish />}
                </div>
            </main>
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
                <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                    <Link href="/" className="hover:text-red-600 transition-colors">{t('home')}</Link>
                    <span>·</span>
                    <Link href="/privacy" className="hover:text-red-600 transition-colors">{t('privacyPolicy')}</Link>
                </div>
            </div>
        </div>
    );
}

function TermsEnglish() {
    return (
        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 text-sm text-gray-600">
                <strong className="text-black">Please read these terms carefully.</strong> By accessing or using Tunda Business Assistant, you agree to be bound by these Terms of Service. If you disagree with any part, you may not use the Service.
            </div>

            <Section title="1. Acceptance of Terms">
                <p>By creating an account or using Tunda Business Assistant, you confirm that you are at least 18 years old and have the legal authority to enter into this agreement on behalf of yourself or your business.</p>
            </Section>

            <Section title="2. Description of Service">
                <p>Tunda Business Assistant is a business management platform that provides:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>AI-powered transaction recording and parsing</li>
                    <li>Business dashboard metrics (revenue, profit/loss, expenses, inventory)</li>
                    <li>Excel file import for bulk transaction entry</li>
                    <li>Credit and payment tracking</li>
                    <li>Bilingual interface (English / Luganda)</li>
                </ul>
            </Section>

            <Section title="3. User Accounts">
                <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use of your account. We are not liable for any loss resulting from unauthorized account access.</p>
            </Section>

            <Section title="4. Acceptable Use">
                <p>You agree not to:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Use the Service for any unlawful purpose or fraudulent activity</li>
                    <li>Enter false, misleading, or fabricated transaction data</li>
                    <li>Attempt to reverse-engineer or exploit any part of the platform</li>
                    <li>Upload files containing malware, viruses, or harmful code</li>
                    <li>Interfere with the operation of the Service or other users&apos; access</li>
                </ul>
            </Section>

            <Section title="5. Data Ownership">
                <p>You retain full ownership of all business data you enter into Tunda Business Assistant. We do not claim ownership over your transaction records, customer data, or financial information. By using the Service, you grant us a limited licence to process and store your data solely to deliver the Service.</p>
            </Section>

            <Section title="6. AI-Assisted Features">
                <p>Tunda Business Assistant uses AI (via Groq) to parse and classify your transaction entries. While we strive for accuracy, AI-generated classifications may occasionally be incorrect. You are responsible for reviewing and verifying all transaction records in your dashboard.</p>
            </Section>

            <Section title="7. Limitation of Liability">
                <p>To the maximum extent permitted by applicable law, Tunda Business Assistant and its operators shall not be liable for:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Any indirect, incidental, or consequential damages</li>
                    <li>Loss of data, revenue, or profits arising from use of the Service</li>
                    <li>Errors in AI-generated transaction classifications</li>
                    <li>Service interruptions or downtime</li>
                </ul>
            </Section>

            <Section title="8. Service Availability">
                <p>We strive to maintain high availability, but we do not guarantee uninterrupted access. The Service may be temporarily unavailable for maintenance, upgrades, or due to circumstances beyond our control.</p>
            </Section>

            <Section title="9. Termination">
                <p>We reserve the right to suspend or terminate your account if you violate these Terms. You may also delete your account at any time. Upon termination, your data will be deleted in accordance with our Privacy Policy.</p>
            </Section>

            <Section title="10. Changes to Terms">
                <p>We may update these Terms of Service periodically. Continued use of the Service after changes are posted constitutes your acceptance of the new terms. We recommend reviewing this page regularly.</p>
            </Section>

            <Section title="11. Governing Law">
                <p>These Terms are governed by and construed in accordance with the laws of Uganda. Any disputes arising from the use of the Service shall be subject to the exclusive jurisdiction of the courts of Uganda.</p>
            </Section>
        </div>
    );
}

function TermsLuganda() {
    return (
        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 text-sm text-gray-600">
                <strong className="text-black">Nsaba oyesome amateeka gano bulungi.</strong> Nga oyingira oba okukozesa Tunda Business Assistant, okwetaba kwo mu Amateeka g&apos;Okukolera kuno. Bw&apos;oteeka emitima gyo okukyusa ekitundu kyonna, oyinza okuggyawo okukozesa Okukolera.
            </div>

            <Section title="1. Okwetaba mu Amateeka">
                <p>Nga otondawo akawunti oba okukozesa Tunda Business Assistant, okakasa nti oli n&apos;emyaka 18 oba okusukka era olin&apos;obuyinza bwa maaso okwetaba mu mateeka gano mu nnyini wo oba mu kibiina kyo.</p>
            </Section>

            <Section title="2. Ebikolwa by'Okukolera">
                <p>Tunda Business Assistant kiwandiike ebikolwa bya wanawana ebisinziira ku:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Okuwandiika enkola n&apos;okuziterekeza nga okozesa AI</li>
                    <li>Empame z&apos;entebe y&apos;obugule (omuwendo, nnono/okufiira, ebyawasiddwa, ebintu)</li>
                    <li>Okutwalira fayiro za Excel okuteeka enkola eziyingi</li>
                    <li>Okuteeka ebyoyo n&apos;okusasula</li>
                    <li>Okukozesa mu Oluganda n&apos;Olungereza</li>
                </ul>
            </Section>

            <Section title="3. Akawunti y'Omukozesa">
                <p>Oli mulungi okukuuma ebyama by&apos;akawunti yo. Oyetaba okututegeeza amangu ddala bw&apos;ekawunti yo ebibwa amaanyi. Tetuli balunzi ba buzibu obwo buva mu okufiika akawunti yo nga si we.</p>
            </Section>

            <Section title="4. Okukozesa Okutuufu">
                <p>Oyetaba obutakola ebino:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Okukozesa Okukolera mu kulaga ensonga ezikyalivu oba okunyooma</li>
                    <li>Okuwandiika ebigambo by&apos;enkola ebitali bya kweli oba ebisuuligwa</li>
                    <li>Okugezaako okumenyamu oba okukozesa ekitundu kyonna kya katale</li>
                    <li>Okubuusa fayiro ezirimu vayilyasi oba ebisinziira ebibi</li>
                    <li>Okulwana n&apos;okukola kw&apos;Okukolera oba okufiika kwa bakozesa abalala</li>
                </ul>
            </Section>

            <Section title="5. Obwanannyini bw'Ebigambo">
                <p>Oyogerako obwanannyini bw&apos;ebigambo byonna by&apos;obusuubuzi bye owaabiika mu Tunda Business Assistant. Tetufumita ku enkola zo, ebigambo by&apos;abagula, oba amawulire g&apos;obufuzi. Nga okozesa Okukolera, otuwaayo obutu obuwewamu bw&apos;okutegeka n&apos;okugumya ebigambo byo kwekka okuwaayo Okukolera.</p>
            </Section>

            <Section title="6. Ebikolwa Eby'AI">
                <p>Tunda Business Assistant ikozesa AI (okuyitira mu Groq) okukwata n&apos;okugabanya enkola zo. Ne bwe twogerako obulungi, okugabanya kwa AI kweyinza okuba kwa bukyamu emirundi gemingi. Oli mulungi okukebera n&apos;okukakasa enkola zonna z&apos;entebe yo mu ntebe y&apos;obugule.</p>
            </Section>

            <Section title="7. Okubeera Mu Maka g'Obuzibu">
                <p>Okutuuka wansi ow&apos;amateeka agaakolekerwa, Tunda Business Assistant n&apos;abakola bayo tebali balunzi ba:</p>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                    <li>Ebizibu byonna ebyolugave, ebitasisirizibwa, oba ebivaamu</li>
                    <li>Okufiira kw&apos;ebigambo, omuwendo, oba nnono okuva mu kukozesa Okukolera</li>
                    <li>Ebikyamu mu kugabanya enkola kwa AI</li>
                    <li>Okusoomooza Okukolera oba okugwaawo kw&apos;okukolera</li>
                </ul>
            </Section>

            <Section title="8. Okubeera kwa Okukolera">
                <p>Twogerako obubeerevu obwo obusinga, naye tetugwaana okufikibwa kwona kwona. Okukolera kweyinza okuba tekusobola okufikiwa amangu ddala okw&apos;okukola, okulemererwa, oba olw&apos;ensonga ezikukira amaanyi gaffe.</p>
            </Section>

            <Section title="9. Okusaazaamu">
                <p>Tulinayo eddembe okukweka oba okusazaamu akawunti yo bw&apos;okyusa Amateeka gano. Oyinza naawe okulima akawunti yo buli kiseera. Ng&apos;oluvannyuma lw&apos;okusazaamu, ebigambo byo bisaazaamuwa ng&apos;amateeka gaffe g&apos;Ekyama ge galagira.</p>
            </Section>

            <Section title="10. Okukyusa Amateeka">
                <p>Tuyinza okukyusa Amateeka g&apos;Okukolera gano emirundi n&apos;emirundi. Okweyongereza okukozesa Okukolera ng&apos;oluvannyuma lw&apos;okukyusa kwa amateeka kunnyonnyola okwetaba kwo mu mateeka amakya.</p>
            </Section>

            <Section title="11. Amateeka Agalowoozebwa">
                <p>Amateeka gano gakulembedwa era gasobolodwa ng&apos;amateeka ga Uganda. Okusobanana kwonna okuvana mu kukozesa Okukolera kubeera wansi w&apos;eby&apos;okusenguka by&apos;obutaka bw&apos;enjawulo eby&apos;enkiiko za Uganda.</p>
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="text-base font-bold text-black mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-red-600 rounded-full inline-block" />
                {title}
            </h2>
            <div className="pl-3 space-y-3">{children}</div>
        </section>
    );
}
