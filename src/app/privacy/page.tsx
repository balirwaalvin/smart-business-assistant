import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to App
                    </Link>
                    <p className="text-sm font-bold text-black">Smart Business Assistant</p>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 md:px-8 py-12">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 md:p-12">
                    {/* Title */}
                    <div className="mb-10 pb-8 border-b border-gray-100">
                        <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                            Legal Document
                        </div>
                        <h1 className="text-3xl font-bold text-black mb-2">Privacy Policy</h1>
                        <p className="text-gray-500 text-sm">Last updated: March 3, 2025</p>
                    </div>

                    {/* Intro */}
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 mb-8 text-sm text-gray-600">
                        <strong className="text-black">Your privacy matters to us.</strong> This Privacy Policy explains how Smart Business Assistant collects, uses, stores, and protects your personal and business data when you use our platform.
                    </div>

                    {/* Sections */}
                    <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

                        <Section title="1. Information We Collect">
                            <p>We collect the following categories of information:</p>
                            <SubSection label="a) Account Information">
                                <p>When you sign up, we collect your name, email address, and account credentials through our authentication provider, Clerk. We do not store passwords directly — this is managed securely by Clerk.</p>
                            </SubSection>
                            <SubSection label="b) Business Transaction Data">
                                <p>All transaction records you enter — including sales, purchases, payments, product names, customer names, quantities, and amounts — are stored in our database linked to your unique user ID.</p>
                            </SubSection>
                            <SubSection label="c) Uploaded Files">
                                <p>Excel files you upload for transaction import are stored in DigitalOcean Spaces (private object storage) and linked to your account. These files are not shared with or accessible by other users.</p>
                            </SubSection>
                            <SubSection label="d) Usage Data">
                                <p>We may collect basic technical information such as browser type, device type, and timestamps of actions. This data is used solely for maintaining the Service and is never sold.</p>
                            </SubSection>
                        </Section>

                        <Section title="2. How We Use Your Information">
                            <p>Your information is used exclusively to:</p>
                            <ul>
                                <li>Authenticate you and manage your account session</li>
                                <li>Store and retrieve your business transaction records</li>
                                <li>Generate dashboard metrics (revenue, profit/loss, inventory levels, etc.)</li>
                                <li>Send your transaction text to Groq AI for parsing and classification</li>
                                <li>Store uploaded Excel files for audit and import purposes</li>
                            </ul>
                            <p>We <strong>do not</strong> use your data for advertising, profiling, or any purpose beyond providing the Service.</p>
                        </Section>

                        <Section title="3. Third-Party Services">
                            <p>Smart Business Assistant uses the following third-party services that may process your data:</p>
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
                                        <tr>
                                            <td className="p-3 font-medium">Clerk</td>
                                            <td className="p-3">Authentication & user management</td>
                                            <td className="p-3">Email, name</td>
                                        </tr>
                                        <tr className="bg-gray-50">
                                            <td className="p-3 font-medium">Groq AI</td>
                                            <td className="p-3">AI transaction parsing</td>
                                            <td className="p-3">Transaction text input only</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 font-medium">DigitalOcean</td>
                                            <td className="p-3">Database & file storage hosting</td>
                                            <td className="p-3">All app data (encrypted at rest)</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <p className="mt-3">We encourage you to review the privacy policies of these providers:
                                {' '}<a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Clerk</a>,
                                {' '}<a href="https://groq.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Groq</a>,
                                {' '}<a href="https://www.digitalocean.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">DigitalOcean</a>.
                            </p>
                        </Section>

                        <Section title="4. Data Storage & Security">
                            <p>Your data is stored and protected as follows:</p>
                            <ul>
                                <li><strong>Database:</strong> PostgreSQL on DigitalOcean Managed Database with SSL enforced and access restricted to trusted sources only</li>
                                <li><strong>File Storage:</strong> DigitalOcean Spaces with private access control (files are not publicly accessible by URL)</li>
                                <li><strong>Data Isolation:</strong> Every record is tagged with your unique user ID. No other user can access your data</li>
                                <li><strong>Transit Security:</strong> All communication between your browser and our servers is encrypted via HTTPS/TLS</li>
                            </ul>
                        </Section>

                        <Section title="5. Data Retention">
                            <p>We retain your data for as long as your account is active. If you choose to delete your account:</p>
                            <ul>
                                <li>Your transaction records, inventory data, and credit ledger will be permanently deleted from our database</li>
                                <li>Uploaded Excel files will be removed from DigitalOcean Spaces</li>
                                <li>Account information managed by Clerk will be handled per Clerk's data deletion policies</li>
                            </ul>
                            <p>To request account deletion, please contact us directly.</p>
                        </Section>

                        <Section title="6. Data Sharing">
                            <p>We do not sell, rent, or share your personal or business data with any third party for commercial purposes. We may disclose your data only if:</p>
                            <ul>
                                <li>Required to do so by law or a valid legal process</li>
                                <li>Necessary to protect the rights, property, or safety of our users or the public</li>
                            </ul>
                        </Section>

                        <Section title="7. Your Rights">
                            <p>You have the right to:</p>
                            <ul>
                                <li><strong>Access:</strong> Request a copy of all data stored about you</li>
                                <li><strong>Correction:</strong> Request correction of inaccurate data</li>
                                <li><strong>Deletion:</strong> Request permanent deletion of your account and all associated data</li>
                                <li><strong>Portability:</strong> Request an export of your transaction data in a standard format</li>
                            </ul>
                            <p>To exercise these rights, please contact us through the platform.</p>
                        </Section>

                        <Section title="8. Children's Privacy">
                            <p>The Service is intended for use by adults and business owners. We do not knowingly collect personal information from individuals under the age of 18. If you believe a minor has provided us with personal information, please contact us immediately.</p>
                        </Section>

                        <Section title="9. Changes to This Policy">
                            <p>We may update this Privacy Policy from time to time. When we do, we will update the "Last updated" date at the top of this page. For significant changes, we will make reasonable efforts to notify users through the platform. Your continued use of the Service after changes take effect constitutes acceptance of the updated policy.</p>
                        </Section>

                        <Section title="10. Contact Us">
                            <p>If you have any questions, concerns, or requests regarding this Privacy Policy or the handling of your data, please contact us through the Smart Business Assistant platform.</p>
                        </Section>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
                <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                    <Link href="/" className="hover:text-red-600 transition-colors">Home</Link>
                    <span>·</span>
                    <Link href="/terms" className="hover:text-red-600 transition-colors">Terms of Service</Link>
                </div>
            </div>
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

function SubSection({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="ml-2 mt-2">
            <p className="font-semibold text-black mb-1">{label}</p>
            <div className="pl-2">{children}</div>
        </div>
    );
}
