/**
 * lib/themes.ts
 * Définition des 8 thématiques de CogniScroll.
 * Chaque thème contient ses métadonnées et des sujets suggérés pour guider Gemini.
 */

import type { Theme } from './types';

export const THEMES: Theme[] = [
  {
    id: 'films',
    name: 'Films',
    emoji: '🎬',
    colorVar: '--theme-films',
    gradient: 'linear-gradient(135deg, oklch(0.55 0.22 35), oklch(0.45 0.2 15))',
    description: 'Cinéma mondial, réalisateurs, chefs-d\'œuvre et histoire du 7e art',
    suggestedTopics: [
      'L\'histoire du cinéma muet',
      'La Nouvelle Vague française',
      'Stanley Kubrick et son style unique',
      'L\'âge d\'or d\'Hollywood',
      'Les effets spéciaux au cinéma',
      'Akira Kurosawa et le cinéma japonais',
      'Le film noir américain',
      'Les Oscars : histoire et controverses',
      'Le néoréalisme italien',
      'Christopher Nolan et la narration non-linéaire',
    ],
  },
  {
    id: 'histoire',
    name: 'Histoire',
    emoji: '📜',
    colorVar: '--theme-histoire',
    gradient: 'linear-gradient(135deg, oklch(0.52 0.15 55), oklch(0.42 0.13 35))',
    description: 'Grandes civilisations, événements marquants et figures historiques',
    suggestedTopics: [
      'La chute de l\'Empire romain',
      'La Révolution française',
      'L\'Égypte ancienne et ses pharaons',
      'La Seconde Guerre mondiale',
      'La Route de la Soie',
      'La Renaissance italienne',
      'Les croisades',
      'L\'Empire ottoman',
      'La conquête de l\'Amérique',
      'La Guerre Froide',
    ],
  },
  {
    id: 'litterature',
    name: 'Littérature',
    emoji: '📖',
    colorVar: '--theme-litterature',
    gradient: 'linear-gradient(135deg, oklch(0.55 0.18 145), oklch(0.45 0.16 125))',
    description: 'Grands auteurs, mouvements littéraires et œuvres incontournables',
    suggestedTopics: [
      'Shakespeare et ses chefs-d\'œuvre',
      'Le surréalisme en littérature',
      'Victor Hugo et Les Misérables',
      'La littérature africaine contemporaine',
      'Marcel Proust et À la recherche du temps perdu',
      'Le roman policier : origines et évolution',
      'Jorge Luis Borges et le labyrinthe',
      'La beat generation américaine',
      'Dostoïevski et la psychologie humaine',
      'Les dystopies littéraires',
    ],
  },
  {
    id: 'musique',
    name: 'Musique',
    emoji: '🎵',
    colorVar: '--theme-musique',
    gradient: 'linear-gradient(135deg, oklch(0.6 0.25 0), oklch(0.5 0.22 340))',
    description: 'Genres musicaux, compositeurs légendaires et histoire de la musique',
    suggestedTopics: [
      'L\'histoire du jazz',
      'Mozart et son génie précoce',
      'La naissance du rock and roll',
      'Bach et la musique baroque',
      'Le blues et ses origines',
      'L\'électronique et la musique techno',
      'Les Beatles et la Beatlemania',
      'Beethoven : sourd mais génial',
      'Le hip-hop : origines et évolution',
      'La musique classique indienne',
    ],
  },
  {
    id: 'philosophie',
    name: 'Philosophie',
    emoji: '🤔',
    colorVar: '--theme-philosophie',
    gradient: 'linear-gradient(135deg, oklch(0.5 0.22 280), oklch(0.4 0.2 260))',
    description: 'Grandes idées, courants philosophiques et penseurs qui ont changé le monde',
    suggestedTopics: [
      'Socrate et la maïeutique',
      'L\'existentialisme de Sartre',
      'Le stoïcisme au quotidien',
      'Platon et la caverne',
      'Nietzsche et le surhomme',
      'Le bouddhisme comme philosophie',
      'Descartes et le cogito',
      'L\'éthique d\'Aristote',
      'Le nihilisme : sens ou absurde ?',
      'Karl Marx et le matérialisme historique',
    ],
  },
  {
    id: 'psychologie',
    name: 'Psychologie',
    emoji: '🧠',
    colorVar: '--theme-psychologie',
    gradient: 'linear-gradient(135deg, oklch(0.55 0.2 195), oklch(0.45 0.18 175))',
    description: 'Comportement humain, biais cognitifs, inconscient et sciences de l\'esprit',
    suggestedTopics: [
      'Les biais cognitifs les plus courants',
      'Freud et l\'inconscient',
      'La psychologie positive',
      'L\'effet Dunning-Kruger',
      'La conformité sociale : l\'expérience de Milgram',
      'L\'intelligence émotionnelle',
      'Les théories de la mémoire',
      'La psychologie des foules',
      'Carl Jung et l\'inconscient collectif',
      'Les troubles de la personnalité',
    ],
  },
  {
    id: 'religion',
    name: 'Religion',
    emoji: '🙏',
    colorVar: '--theme-religion',
    gradient: 'linear-gradient(135deg, oklch(0.7 0.18 70), oklch(0.6 0.16 50))',
    description: 'Grandes religions du monde, mythologies et spiritualités',
    suggestedTopics: [
      'Les origines du christianisme',
      'L\'islam : histoire et piliers',
      'Le judaïsme et la Torah',
      'L\'hindouisme : panthéon et rituels',
      'La mythologie grecque',
      'Le bouddhisme tibétain',
      'La mythologie nordique',
      'Le shintoïsme japonais',
      'Les religions de l\'Égypte ancienne',
      'Le soufisme : mystique islamique',
    ],
  },
  {
    id: 'science',
    name: 'Science',
    emoji: '🔬',
    colorVar: '--theme-science',
    gradient: 'linear-gradient(135deg, oklch(0.55 0.22 235), oklch(0.45 0.2 215))',
    description: 'Physique, biologie, chimie, astronomie et grandes découvertes scientifiques',
    suggestedTopics: [
      'La théorie de la relativité d\'Einstein',
      'L\'ADN : la molécule de la vie',
      'Le Big Bang et l\'origine de l\'univers',
      'La mécanique quantique expliquée',
      'Darwin et l\'évolution des espèces',
      'Les trous noirs',
      'La physique des particules',
      'La révolution copernicienne',
      'CRISPR et le génie génétique',
      'La conquête de l\'espace',
    ],
  },
];

/** Récupère un thème par son ID */
export function getThemeById(id: string): Theme | undefined {
  return THEMES.find((t) => t.id === id);
}

/** Retourne un sujet aléatoire non encore exploré */
export function getRandomTopic(themeId: string, completedTopics: string[]): string {
  const theme = getThemeById(themeId);
  if (!theme) return 'Sujet général';

  const available = theme.suggestedTopics.filter(
    (t) => !completedTopics.includes(t)
  );

  if (available.length === 0) {
    // Tous les sujets explorés : on laisse Gemini innover
    return `Un sujet fascinant et original sur ${theme.name}`;
  }

  return available[Math.floor(Math.random() * available.length)];
}
