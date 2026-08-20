import { useState, useEffect } from 'react';

export function useDesktop() {
    const getIsDesktop = () => typeof window !== 'undefined' ? window.innerWidth >= 1024 : false;
    const [isDesktop, setIsDesktop] = useState(getIsDesktop());

    useEffect(() => {
        const handleResize = () => setIsDesktop(getIsDesktop());
        // Set initially just in case it hydrates differently
        handleResize();

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isDesktop;
}
