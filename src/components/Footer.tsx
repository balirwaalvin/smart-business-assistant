import Link from 'next/link';
import Image from 'next/image';
import { useLang } from '@/contexts/LangContext';

export default function Footer() {
    const year = new Date().getFullYear();
    const { t } = useLang();

    return (
        <footer className="mt-16 border-t border-violet-200/70 bg-white/80 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    {/* Brand */}
                    <div className="text-center md:text-left flex items-center gap-2">
                        <Image
                            src="https://fra.cloud.appwrite.io/v1/storage/buckets/69c237260035606fa83d/files/69c2373f000957ba5766/view?project=69c1877a00011c00a170&mode=admin"
                            alt="TUNDA Logo"
                            width={28}
                            height={28}
                            className="tunda-logo"
                            style={{ borderRadius: '8px' }}
                        />
                        <div>
                            <p className="text-sm font-bold tunda-wordmark tunda-wordmark-light">TUNDA Business Assistant</p>
                            <p className="text-xs text-gray-600 mt-0.5">{t('poweredBy').split(' — ')[0]}</p>
                        </div>
                    </div>

                    {/* Links */}
                    <div className="flex items-center gap-6 text-sm text-gray-700">
                        <Link
                            href="/terms"
                            className="hover:text-violet-700 transition-colors hover:underline underline-offset-2"
                        >
                            {t('termsOfService')}
                        </Link>
                        <span className="text-gray-300">|</span>
                        <Link
                            href="/privacy"
                            className="hover:text-violet-700 transition-colors hover:underline underline-offset-2"
                        >
                            {t('privacyPolicy')}
                        </Link>
                    </div>

                    {/* Copyright */}
                    <p className="text-xs text-gray-600">
                        &copy; {year} TUNDA Business Assistant. {t('allRightsReserved')}
                    </p>
                </div>
            </div>
        </footer>
    );
}
