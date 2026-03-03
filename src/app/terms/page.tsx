import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
                    <p className="text-sm font-bold text-black">Graceful Business Assistant</p>
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
                        <h1 className="text-3xl font-bold text-black mb-2">Terms of Service</h1>
                        <p className="text-gray-500 text-sm">Last updated: March 3, 2025</p>
                    </div>

                    {/* Sections */}
                    <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">

                        <Section title="1. Acceptance of Terms">
                            <p>By accessing or using Graceful Business Assistant ("the Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use the Service.</p>
                            <p>These Terms apply to all users, including individuals and businesses, who access or use the Service. The Graceful Business Assistant platform is designed for small and medium-sized enterprises (SMEs), particularly in Uganda and the East African region.</p>
                        </Section>

                        <Section title="2. Description of Service">
                            <p>Graceful Business Assistant is an AI-powered business intelligence platform, driven by Graceful Intelligence, that enables users to:</p>
                            <ul>
                                <li>Record business transactions using natural language input</li>
                                <li>Import transaction data via Excel spreadsheets</li>
                                <li>View financial dashboards including revenue, profit/loss, stock levels, and customer credit balances</li>
                                <li>Receive AI-generated insights and transaction parsing powered by Groq AI</li>
                            </ul>
                            <p>The Service is provided on an "as is" and "as available" basis. We reserve the right to modify, suspend, or discontinue any part of the Service at any time.</p>
                        </Section>

                        <Section title="3. User Accounts & Authentication">
                            <p>To access the Service, you must create an account through our authentication provider (Clerk). You are responsible for:</p>
                            <ul>
                                <li>Maintaining the confidentiality of your account credentials</li>
                                <li>All activity that occurs under your account</li>
                                <li>Notifying us immediately of any unauthorized account access</li>
                            </ul>
                            <p>We reserve the right to terminate accounts that violate these Terms or that have been inactive for an extended period.</p>
                        </Section>

                        <Section title="4. Data Ownership & Usage">
                            <p>You retain full ownership of all business data you input into the Service, including transaction records, inventory details, and customer information.</p>
                            <p>By using the Service, you grant us a limited, non-exclusive license to store and process your data solely for the purpose of providing the Service to you. We do not sell, share, or use your business data for any commercial purpose beyond service delivery.</p>
                            <p>AI analysis of your transactions is performed by Groq AI's API. Your data is transmitted to Groq's servers solely for the purpose of parsing and understanding your inputs. Please review <a href="https://groq.com/privacy" target="_blank" rel="noopener noreferrer" className="text-red-600 hover:underline">Groq's Privacy Policy</a> for more information.</p>
                        </Section>

                        <Section title="5. Acceptable Use">
                            <p>You agree not to use the Service to:</p>
                            <ul>
                                <li>Input false, misleading, or fraudulent financial information</li>
                                <li>Violate any applicable local, national, or international laws or regulations</li>
                                <li>Attempt to gain unauthorized access to any part of the Service or its infrastructure</li>
                                <li>Upload malicious files or content that could harm the Service or other users</li>
                                <li>Reverse engineer, decompile, or attempt to extract the source code of the Service</li>
                            </ul>
                        </Section>

                        <Section title="6. Financial Data Disclaimer">
                            <p>The financial metrics, profit/loss calculations, and business insights provided by the Service are for informational purposes only. They <strong>do not constitute professional financial advice</strong>.</p>
                            <p>Graceful Business Assistant is not a licensed financial institution, accounting firm, or tax advisor. You should consult a qualified financial professional before making major business decisions based on data from the Service.</p>
                            <p>Profit and loss estimations are calculated based solely on data you have entered. The accuracy of these figures depends entirely on the completeness and correctness of your input data.</p>
                        </Section>

                        <Section title="7. Data Storage & Security">
                            <p>Your transaction data is stored in a managed PostgreSQL database hosted on DigitalOcean. Excel files you upload are stored in DigitalOcean Spaces (object storage). We implement industry-standard security measures including:</p>
                            <ul>
                                <li>SSL/TLS encryption for all data in transit</li>
                                <li>Database access restricted to trusted sources only</li>
                                <li>User data strictly isolated by unique user ID</li>
                            </ul>
                            <p>While we take reasonable precautions, no method of electronic storage or transmission is 100% secure. We cannot guarantee absolute security of your data.</p>
                        </Section>

                        <Section title="8. Service Availability">
                            <p>We strive to maintain high availability of the Service, but we do not guarantee uninterrupted access. Scheduled maintenance, updates, or unforeseen technical issues may cause temporary downtime.</p>
                        </Section>

                        <Section title="9. Limitation of Liability">
                            <p>To the maximum extent permitted by applicable law, Graceful Business Assistant and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunities, arising from your use of or inability to use the Service.</p>
                        </Section>

                        <Section title="10. Changes to Terms">
                            <p>We reserve the right to update these Terms at any time. We will notify users of material changes by updating the "Last updated" date at the top of this page. Continued use of the Service after changes constitutes your acceptance of the revised Terms.</p>
                        </Section>

                        <Section title="11. Contact Us">
                            <p>If you have any questions about these Terms of Service, please contact us through the Graceful Business Assistant platform or reach out to the development team.</p>
                        </Section>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
                <div className="flex items-center justify-center gap-6 text-sm text-gray-400">
                    <Link href="/" className="hover:text-red-600 transition-colors">Home</Link>
                    <span>·</span>
                    <Link href="/privacy" className="hover:text-red-600 transition-colors">Privacy Policy</Link>
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
            <div className="pl-3 space-y-2">{children}</div>
        </section>
    );
}
