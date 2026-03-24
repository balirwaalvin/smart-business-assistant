'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useLang } from '@/contexts/LangContext';

export default function PrivacyPolicy() {
    const { t, toggleLang, isLuganda } = useLang();

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-violet-700 transition-colors">
                        <ArrowLeft className="w-4 h-4" />
                        {t('backToApp')}
                    </Link>
                    <div className="flex items-center gap-3">
                        <button onClick={toggleLang} className="px-3 py-1 text-xs font-semibold rounded-full border border-gray-300 hover:border-violet-500 hover:text-violet-700 transition-colors text-gray-600">
                            🌐 {t('switchToLang')}
                        </button>
                        <p className="text-sm font-bold text-black">Tunda Business Assistant</p>
                    </div>
                </div>
            </header>
            <main className="max-w-4xl mx-auto px-4 md:px-8 py-12">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12">
                    <div className="mb-10 pb-8 border-b border-gray-100">
                        <div className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">{t('legalDoc')}</div>
                        <h1 className="text-3xl font-bold text-black mb-2">{t('privacyPolicy')}</h1>
                        <p className="text-gray-500 text-sm">{isLuganda ? 'Okuggyibwa: Marisi 3, 2025' : 'Last updated: March 3, 2025'}</p>
                    </div>
                    {isLuganda ? <PrivacyLuganda /> : <PrivacyEnglish />}
                </div>
            </main>
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
                <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                    <Link href="/" className="hover:text-violet-700 transition-colors">{t('home')}</Link>
                    <span>·</span>
                    <Link href="/terms" className="hover:text-violet-700 transition-colors">{t('termsOfService')}</Link>
                </div>
            </div>
        </div>
    );
}

function PrivacyEnglish() {
    return (
        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 text-sm text-gray-600">
                <strong className="text-black">Your privacy matters to us.</strong> This Privacy Policy explains how Tunda Business Assistant collects, uses, stores, and protects your personal and business data when you use our platform.
            </div>

            <Section title="1. Information We Collect">
                <p>We collect the following categories of information:</p>
                <SubSec label="a) Account Information">
                    <p>When you sign up, we collect your name, email address, and account credentials through Appwrite Authentication. We do not store passwords directly.</p>
                </SubSec>
                <SubSec label="b) Business Transaction Data">
                    <p>All transaction records you enter — including sales, purchases, expenses, payments, product names, customer names, quantities, and amounts — are stored linked to your unique user ID.</p>
                </SubSec>
                <SubSec label="c) Uploaded Files">
                    <p>Excel files you upload are stored in Appwrite Storage (private object storage) and linked to your account. Not accessible by other users.</p>
                </SubSec>
                <SubSec label="d) Usage Data">
                    <p>We may collect basic technical information such as browser type and timestamps. This data is used solely for maintaining the Service and is never sold.</p>
                </SubSec>
            </Section>

            <Section title="2. How We Use Your Information">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Authenticate you and manage your account session</li>
                    <li>Store and retrieve your business transaction records</li>
                    <li>Generate dashboard metrics (revenue, profit/loss, inventory levels, etc.)</li>
                    <li>Send your transaction text to Claude AI for parsing and classification</li>
                    <li>Store uploaded Excel files for audit and import purposes</li>
                </ul>
                <p>We <strong>do not</strong> use your data for advertising or profiling.</p>
            </Section>

            <Section title="3. Third-Party Services">
                <div className="overflow-x-auto mt-3">
                    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left p-3 font-bold text-black">Service</th>
                                <th className="text-left p-3 font-bold text-black">Purpose</th>
                                <th className="text-left p-3 font-bold text-black">Data Shared</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr><td className="p-3 font-medium">Appwrite Authentication</td><td className="p-3">Authentication</td><td className="p-3">Email, name</td></tr>
                            <tr className="bg-gray-50"><td className="p-3 font-medium">Claude AI</td><td className="p-3">AI transaction parsing</td><td className="p-3">Transaction text only</td></tr>
                            <tr><td className="p-3 font-medium">Appwrite</td><td className="p-3">Database &amp; file storage</td><td className="p-3">All app data (encrypted)</td></tr>
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="4. Data Storage &amp; Security">
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Database:</strong> Appwrite Databases with project-level access control</li>
                    <li><strong>File Storage:</strong> Appwrite Storage with private access control</li>
                    <li><strong>Data Isolation:</strong> Every record is tagged with your unique user ID</li>
                    <li><strong>Transit Security:</strong> All communication encrypted via HTTPS/TLS</li>
                </ul>
            </Section>

            <Section title="5. Data Retention">
                <p>We retain your data for as long as your account is active. To request account deletion, please contact us directly.</p>
            </Section>

            <Section title="6. Data Sharing">
                <p>We do not sell, rent, or share your personal or business data with any third party for commercial purposes.</p>
            </Section>

            <Section title="7. Your Rights">
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Access:</strong> Request a copy of all data stored about you</li>
                    <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                    <li><strong>Deletion:</strong> Request permanent deletion of your account and data</li>
                    <li><strong>Portability:</strong> Request an export of your transaction data</li>
                </ul>
            </Section>

            <Section title="8. Children&apos;s Privacy">
                <p>The Service is intended for adults and business owners. We do not knowingly collect information from individuals under 18.</p>
            </Section>

            <Section title="9. Changes to This Policy">
                <p>We may update this Privacy Policy from time to time. Your continued use of the Service after changes constitutes acceptance.</p>
            </Section>

            <Section title="10. Contact Us">
                <p>If you have any questions, please contact us through the Tunda Business Assistant platform.</p>
            </Section>
        </div>
    );
}

function PrivacyLuganda() {
    return (
        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 text-sm text-gray-600">
                <strong className="text-black">Ekyama kyo kisaasira ennyo.</strong> Amateeka g&apos;Ekyama gano gannyonnyola engeri Tunda Business Assistant gye ikungaanya, okukozesa, okugumya, n&apos;okukuuma ebigambo byo eby&apos;obwannakyewa n&apos;ebikolwa bya kibiina ng&apos;okozesa katale lyaffe.
            </div>

            <Section title="1. Ebigambo Bye Tukungaanya">
                <SubSec label="a) Amawulire g'Akawunti">
                    <p>Ng&apos;oyingira mu kiwandiiko, tukungaanya erinnya lyo, endagiriro y&apos;imeyili, n&apos;ebibuuzo by&apos;akawunti yo nga tokozesa Appwrite Authentication. Tetusubirira bigiriiza butereevu.</p>
                </SubSec>
                <SubSec label="b) Ebigambo by'Enkola z'Omulimu">
                    <p>Enkola zonna oziwandiika — nga amasuza, ebyaguliwa, ebyawasiddwa, okusasula, erinnya ly&apos;ekintu, omugula, obungi, n&apos;omuwendo — bigumizibwa mu databeesi yaffe eri ku mupiira gwo ogw&apos;akakyuka.</p>
                </SubSec>
                <SubSec label="c) Fayiro Ezibuusibwa">
                    <p>Fayiro za Excel ze obuusa okutwalirizibwawo enkola bazikuuma mu Appwrite Storage. Tezirabibwa oba okufikibwa abantu abalala.</p>
                </SubSec>
                <SubSec label="d) Amawulire g'Okukozesa">
                    <p>Tweyinza kukungaanya amawulire amanongwa g&apos;ebyokuyambisa. Ebigambo ebyo bikozesebwa kwekka okusuubirira okukola kw&apos;Okukolera.</p>
                </SubSec>
            </Section>

            <Section title="2. Engeri Gye Tukozesa Ebigambo Byo">
                <ul className="list-disc pl-5 space-y-1">
                    <li>Okukakasa endaga yo n&apos;okukuuma ekikolobero ky&apos;akawunti yo</li>
                    <li>Okugumya n&apos;okuzzaamu enkola zo z&apos;omulimu</li>
                    <li>Okukolaako empame z&apos;entebe y&apos;obugule (omuwendo, nnono/okufiira, ebintu)</li>
                    <li>Okutuma bigambo by&apos;enkola yo eri Claude AI okufulumya n&apos;okugabanya enkola</li>
                    <li>Okugumya fayiro za Excel okutuusa enaku z&apos;ekibaliriro n&apos;okutwaliriza</li>
                </ul>
                <p>Tetukozesa ebigambo byo okuwebeza oba okukozesa endagiriro.</p>
            </Section>

            <Section title="3. Emikolo egy'Eddungu">
                <div className="overflow-x-auto mt-3">
                    <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left p-3 font-bold text-black">Okukolera</th>
                                <th className="text-left p-3 font-bold text-black">Ekigendererwa</th>
                                <th className="text-left p-3 font-bold text-black">Ebigambo Ebiweebwa</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            <tr><td className="p-3 font-medium">Appwrite Authentication</td><td className="p-3">Okukakasa endaga</td><td className="p-3">Imeyili, erinnya</td></tr>
                            <tr className="bg-gray-50"><td className="p-3 font-medium">Claude AI</td><td className="p-3">Okukwata enkola za AI</td><td className="p-3">Ebigambo by&apos;enkola kwekka</td></tr>
                            <tr><td className="p-3 font-medium">Appwrite</td><td className="p-3">Okusuukira databeesi n&apos;fayiro</td><td className="p-3">Ebigambo byonna (bisuulibwa)</td></tr>
                        </tbody>
                    </table>
                </div>
            </Section>

            <Section title="4. Okusuukira Ebigambo n'Obukuumi">
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Databeesi:</strong> Appwrite Databases n&apos;okukuuma ku mutendera gwa project</li>
                    <li><strong>Okugumya Fayiro:</strong> Appwrite Storage ng&apos;okwetanna obwanguka</li>
                    <li><strong>Okubeera kwa Ebigambo:</strong> Ekiragiro kyonna kikwantaganizibwa n&apos;omupiri gwo</li>
                    <li><strong>Obukuumi mu Kukyalira:</strong> Okubulayibiza kwonna kukuumibwa ku HTTPS/TLS</li>
                </ul>
            </Section>

            <Section title="5. Okugumyako kwa Ebigambo">
                <p>Tugumya ebigambo byo okutuusa akawunti yo nga yali mu muwendo. Oyagala okukwatula akawunti yo, oteekwa okutubuulira butereevu.</p>
            </Section>

            <Section title="6. Okubalirirana kw'Ebigambo">
                <p>Tetuza, tekikira, oba kutawanya ebigambo byo by&apos;obwannakyewa oba bya kibiina ne muntu yenna owagatuufu oba wa bintu.</p>
            </Section>

            <Section title="7. Eddembe Lyo">
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Okufuna:</strong> Okusaba okuweebwa kopi ya ebigambo byonna</li>
                    <li><strong>Okukyusa:</strong> Okusaba okukyusibwawo kwa ebigambo ebitali bya butuufu</li>
                    <li><strong>Okusazaamu:</strong> Okusaba okusazaamu buteeke akawunti yo n&apos;ebigambo byonna</li>
                    <li><strong>Okutwalira:</strong> Okusaba okufulumyibwa kwa ebigambo by&apos;enkola zo</li>
                </ul>
            </Section>

            <Section title="8. Ekyama kya Baana">
                <p>Okukolera kuneetaagisa bakuze n&apos;abanyombozi b&apos;obusuubuzi. Tetukungaanya amawulire okuva eri abantu abali wansi w&apos;emyaka 18.</p>
            </Section>

            <Section title="9. Okukyusa Amateeka gano">
                <p>Tuyinza okukyusa Amateeka g&apos;Ekyama gano eddiini n&apos;eddiini. Okweyongereza okukozesa Okukolera ng&apos;oluvannyuma lw&apos;okukyusa kwa amateeka kunnyonnyola okwetaba kwo.</p>
            </Section>

            <Section title="10. Oyogera Naffe">
                <p>Olina ebibuuzo, oyogera naffe ku katale ka Tunda Business Assistant.</p>
            </Section>
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section>
            <h2 className="text-base font-bold text-black mb-3 flex items-center gap-2">
                <span className="w-1 h-5 bg-violet-600 rounded-full inline-block" />
                {title}
            </h2>
            <div className="pl-3 space-y-3">{children}</div>
        </section>
    );
}

function SubSec({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="ml-2 mt-2">
            <p className="font-semibold text-black mb-1">{label}</p>
            <div className="pl-2">{children}</div>
        </div>
    );
}
