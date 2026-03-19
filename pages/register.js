// pages/register.js — Public registration disabled, redirect to login
import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function RegisterPage() {
    const router = useRouter();
    useEffect(() => { router.replace('/login'); }, [router]);
    return null;
}
