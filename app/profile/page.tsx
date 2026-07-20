'use client';

import { useEffect, useState } from 'react';
import AuthGuard from '@/components/layout/AuthGuard';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth-context';
import { getWeeklyStats } from '@/lib/firestore';
import { getLevelForXP, getLevelProgress } from '@/lib/gamification';
import ProfileHeader from '@/components/features/ProfileHeader';
import StatsGrid from '@/components/features/StatsGrid';
import XPCounter from '@/components/features/XPCounter';
import StatsChart from '@/components/features/StatsChart';
import BadgeCollection from '@/components/features/BadgeCollection';
import Link from 'next/link';

/**
 * Page de Profil Utilisateur
 */
export default function ProfilePage() {
  const { user, userProfile } = useAuth();
  const [weeklyData, setWeeklyData] = useState<any>(null);

  useEffect(() => {
    async function loadStats() {
      if (user) {
        console.log('[PROFILE] Chargement des statistiques hebdomadaires');
        const stats = await getWeeklyStats(user.uid);
        setWeeklyData(stats);
      }
    }
    loadStats();
  }, [user]);

  if (!userProfile) return <div className="spinner-lg mt-20 mx-auto"></div>;

  return (
    <AuthGuard>
      <div className="page-wrapper">
        <main className="page-content container py-8">
          
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold">Mon Profil</h1>
            <Link href="/settings" className="btn btn-ghost">⚙️ Paramètres</Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Colonne Gauche : Header & Résumé */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              <ProfileHeader 
                name={userProfile.displayName || 'Utilisateur'} 
                email={userProfile.email}
                createdAt={userProfile.createdAt}
              />
              <div className="card card-glass p-6">
                <h3 className="font-bold mb-4">Progression</h3>
                <XPCounter
                  xp={userProfile.xp || 0}
                  level={userProfile.level || 1}
                  levelName={getLevelForXP(userProfile.xp || 0).name}
                  progress={getLevelProgress(userProfile.xp || 0).progressPercent}
                />
              </div>
            </div>

            {/* Colonne Droite : Stats & Badges */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              <StatsGrid 
                totalLessons={userProfile.totalLessonsCompleted || 0}
                totalXP={userProfile.xp || 0}
                streak={userProfile.streak || 0}
                level={userProfile.level || 1}
              />
              
              <div className="card card-elevated p-6">
                <h3 className="text-xl font-bold mb-4">Activité des 7 derniers jours</h3>
                {weeklyData ? (
                  <StatsChart stats={weeklyData} />
                ) : (
                  <div className="h-40 flex items-center justify-center text-gray-400">Chargement du graphique...</div>
                )}
              </div>

              <div className="card card-glass p-6">
                <h3 className="text-xl font-bold mb-4">Collection de Badges</h3>
                <BadgeCollection earnedBadges={userProfile.badges || []} />
              </div>
            </div>
          </div>

        </main>
      </div>
    </AuthGuard>
  );
}
