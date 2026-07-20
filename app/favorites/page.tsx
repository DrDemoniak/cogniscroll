'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AuthGuard from '@/components/layout/AuthGuard';
import { useAuth } from '@/lib/auth-context';
import { getFavoriteLessons, toggleFavorite } from '@/lib/firestore';
import { useToast } from '@/components/ui/Toast';

/**
 * Page des leçons favorites
 */
export default function FavoritesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { addToast } = useToast();
  
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFavorites() {
      if (!user) return;
      console.log('[FAVORITES] Chargement des favoris');
      try {
        const favs = await getFavoriteLessons(user.uid);
        setFavorites(favs);
      } catch (error) {
        console.error('[FAVORITES] Erreur', error);
      } finally {
        setLoading(false);
      }
    }
    loadFavorites();
  }, [user]);

  const handleRemove = async (e: React.MouseEvent, lessonId: string) => {
    e.stopPropagation(); // Évite de déclencher le clic sur la card
    if (!user) return;
    try {
      await toggleFavorite(user.uid, lessonId, false);
      setFavorites(prev => prev.filter(f => f.id !== lessonId));
      addToast('Retiré des favoris', 'success');
    } catch (err) {
      addToast('Erreur', 'error');
    }
  };

  const handleOpenLesson = (lesson: any) => {
    // On simule l'ouverture d'une ancienne leçon
    sessionStorage.setItem('currentLesson', JSON.stringify(lesson));
    router.push(`/learn/${lesson.themeId || 'general'}/lesson`);
  };

  return (
    <AuthGuard>
      <div className="page-wrapper">
        <main className="page-content container py-8">
          <h1 className="text-3xl font-bold mb-8">Mes Favoris ❤️</h1>

          {loading ? (
            <div className="spinner"></div>
          ) : favorites.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map(fav => (
                <div 
                  key={fav.id} 
                  className="card card-glass card-clickable p-6 relative group"
                  onClick={() => handleOpenLesson(fav)}
                >
                  <h3 className="font-bold text-lg pr-8">{fav.title}</h3>
                  <p className="text-sm text-gray-500 mt-2">
                    Ajouté le {new Date(fav.savedAt).toLocaleDateString()}
                  </p>
                  <button 
                    className="absolute top-4 right-4 text-red-500 opacity-50 hover:opacity-100 transition-opacity"
                    onClick={(e) => handleRemove(e, fav.id)}
                    title="Retirer des favoris"
                  >
                    💔
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state card card-glass p-12 text-center">
              <div className="empty-state-icon text-6xl mb-4">📭</div>
              <h2 className="empty-state-title text-2xl font-bold mb-2">Aucun favori</h2>
              <p className="text-gray-600">Les leçons que tu ajoutes en favoris apparaîtront ici.</p>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
