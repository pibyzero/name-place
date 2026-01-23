import { Language } from "../types/game"

export const DEFAULT_CATEGORIES = [
    'Name',
    'Surname',
    'Place',
    'Animal',
    'Food',
    'Movie'
]

export const TIMER_DURATION = 60 // seconds
export const EN_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const NP_ALPHABET = [
    'क', 'ख', 'ग', 'घ', 'ङ',
    'च', 'छ', 'ज', 'झ', 'ञ',
    'ट', 'ठ', 'ड', 'ढ', 'ण',
    'त', 'थ', 'द', 'ध', 'न',
    'प', 'फ', 'ब', 'भ', 'म',
    'य', 'र', 'ल', 'व',
    'श', 'ष', 'स', 'ह',
    'क्ष', 'त्र', 'ज्ञ',
    'अ'
];

export const getAlphabet = (lang: Language) => {
    switch (lang) {
        case 'english':
            return EN_ALPHABET;
        case "nepali":
            return NP_ALPHABET;
    }
}
