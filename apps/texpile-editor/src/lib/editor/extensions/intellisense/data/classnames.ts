// curated document-class list for \documentclass{...} completion. small and hand-maintained
// (unlike LaTeX Workshop's ~600-entry CTAN scrape) — add more as users ask for them.
export interface ClassInfo {
	name: string;
	detail: string;
}

export const CLASS_NAMES: ClassInfo[] = [
	{ name: 'article', detail: 'Standard: papers, short reports' },
	{ name: 'report', detail: 'Standard: longer reports with chapters' },
	{ name: 'book', detail: 'Standard: books' },
	{ name: 'letter', detail: 'Standard: letters' },
	{ name: 'proc', detail: 'Standard: conference proceedings' },
	{ name: 'slides', detail: 'Standard: transparencies' },
	{ name: 'memoir', detail: 'Flexible book/report replacement' },
	{ name: 'beamer', detail: 'Presentation slides' },
	{ name: 'scrartcl', detail: 'KOMA-Script article' },
	{ name: 'scrreprt', detail: 'KOMA-Script report' },
	{ name: 'scrbook', detail: 'KOMA-Script book' },
	{ name: 'scrlttr2', detail: 'KOMA-Script letter' },
	{ name: 'amsart', detail: 'AMS journal article' },
	{ name: 'amsbook', detail: 'AMS book' },
	{ name: 'amsproc', detail: 'AMS proceedings' },
	{ name: 'IEEEtran', detail: 'IEEE transactions/conference paper' },
	{ name: 'revtex4-2', detail: 'APS/AIP physics journals' },
	{ name: 'elsarticle', detail: 'Elsevier journal article' },
	{ name: 'svjour3', detail: 'Springer journal article' },
	{ name: 'llncs', detail: 'Springer Lecture Notes in Computer Science' },
	{ name: 'acmart', detail: 'ACM journals/proceedings' },
	{ name: 'apa7', detail: 'APA 7th edition manuscripts' },
	{ name: 'exam', detail: 'Exams and quizzes' },
	{ name: 'moderncv', detail: 'CVs and resumes' },
	{ name: 'standalone', detail: 'Single figures/diagrams compiled alone' },
	{ name: 'minimal', detail: 'Bare minimum, for isolating bugs' },
	{ name: 'tufte-book', detail: 'Tufte-style book with sidenotes' },
	{ name: 'tufte-handout', detail: 'Tufte-style handout with sidenotes' },
	{ name: 'subfiles', detail: 'Compilable sub-documents of a larger project' }
];
