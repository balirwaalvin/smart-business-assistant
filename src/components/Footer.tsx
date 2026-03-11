import Link from 'next/link';
import { useLang } from '@/contexts/LangContext';

export default function Footer() {
    const year = new Date().getFullYear();
    const { t } = useLang();

    return (
        <footer className="mt-16 border-t border-gray-200 bg-white">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Brand */}
                    <div className="text-center md:text-left">
                        <p className="text-sm font-bold text-black">Tunda Business Assistant</p>
                        <p className="text-xs text-gray-400 mt-0.5">{t('poweredBy').split(' — ')[0]}</p>
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-6 text-sm text-gray-500">
                        <Link
                            href="/terms"
                            className="hover:text-red-600 transition-colors hover:underline underline-offset-2"
                        >
                            {t('termsOfService')}
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link
                            href="/privacy"
                            className="hover:text-red-600 transition-colors hover:underline underline-offset-2"
                        >
                            {t('privacyPolicy')}
                        </Link>
                    </div>

                    {/* Copyright */}
                    <p className="text-xs text-gray-400">
                        &copy; {year} Tunda Business Assistant. {t('allRightsReserved')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
