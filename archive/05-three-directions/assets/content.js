/**
 * Verified profile details can be added here without changing the layout.
 *
 * Sources were reconciled from the February 2026 CV and November LinkedIn export.
 * Exact job title and formal degree wording await Marc's clarification.
 * Null fields stay hidden. Private comparison notes live outside this repository.
 */
export const profile = {
  currentRole: {
    title: null,
    organisation: 'Siemens Healthineers',
    since: 'April 2026',
    summary: null,
  },
  cvPdf: 'assets/cv/marc-teyra-cv-2026-02.pdf',
  cvLabel: 'Read my CV · February 2026',
  degree: {
    title: 'Artificial Intelligence',
    institution: 'FAU Erlangen-Nürnberg',
    since: 'October 2025',
    focus: 'A biomedical engineering focus, connecting computation with biology, medicine and the physical world.',
  },
  languages: [
    { name:'English', level:'Native / bilingual' },
    { name:'Catalan', level:'Native / bilingual' },
    { name:'Spanish', level:'Professional' },
    { name:'German', level:'Professional' },
    { name:'French', level:'Elementary' },
  ],
  experience: [
    { type:'Labwork & shadowing', title:'Protein engineering at Icosagen', text:'A month in an antibody-discovery lab for my IB Biology Extended Essay: learning laboratory techniques and contributing to a project under the team’s guidance.' },
    { type:'Clinical shadowing · 2024', title:'Veterinary medicine, up close', text:'Observed surgery, radiology and oncology at the Estonian University of Life Sciences, including how digital imaging informs clinical decisions.' },
    { type:'Independent project · 2020', title:'Python for biological data', text:'Wrote scripts to help a University of Toronto researcher filter and analyse biological datasets, applying pandas, regular expressions and Matplotlib.' },
  ],
  credentials: [
    { title:'Digitalisation in Space Research', institution:'Technical University of Munich · March 2025', url:'https://coursera.org/share/86e99f9a072acd3909dc2b5da9a4ab8d' },
    { title:'Computer Science for Python Programming', institution:'HarvardX Professional Certificate · December 2024', url:'https://credentials.edx.org/credentials/4b034a6c229842b3aace4b16784ae9e6/' },
    { title:'CS50’s Introduction to Computer Science', institution:'HarvardX / edX · December 2024', url:'https://courses.edx.org/certificates/7514a0b18ca34740938b57b60db21cc0' },
    { title:'CS50’s Introduction to Programming with Python', institution:'HarvardX / edX · December 2024', url:'https://courses.edx.org/certificates/89a6ba468d544f408900cdee48f8f2f0' },
  ],
};

export const completedProjects = [
  { type:'Team prototype · 2025', title:'Smart indoor climate', text:'At ZHAW, our team built a mobile app around distributed temperature sensors. I helped develop the prototype and led the interactive pitch to an industry partner.' },
  { type:'Team programme · 2025', title:'An idea, tested and pitched', text:'Selected for the EELISA Entrepreneurship School. Our team developed a startup concept and rapid prototype, then took second place in the Best Pitch Award.' },
  { type:'Python · 2024–25', title:'Pharmaceutical data, gathered faster', text:'Built a multithreaded BeautifulSoup scraper for pharmaceutical data, combining my CS50P final project with a practical tool for Icosagen bioengineers.' },
  { type:'Unity / C# / Blender · 2022', title:'A game in 48 hours', text:'Our University of Tartu junior game-jam team built a playable 3D shooter with original visuals, music and enemy mechanics. We finished eighth.' },
  { type:'Robotics · 2017–18', title:'Where the building started', text:'An autonomous Rubik’s Cube solver built with LEGO Mindstorms, followed by FIRST LEGO League. Our team reached the Ontario Provincial Championships and earned a Presentation Award.' },
];

export const publicArchive = [
  { title:'Arch dotfiles', type:'Desktop configuration', text:'An Arch Linux and Hyprland setup with wallpaper-based theming and custom workflow scripts.', url:'https://github.com/mteyra/arch-dotfiles-1.0' },
  { title:'German writing in Emacs', type:'Configuration prototype', text:'Translation commands, vocabulary storage and German input support in an Emacs Lisp configuration.', url:'https://github.com/mteyra/emacs-german-filetype' },
  { title:'Applied Programming 2026', type:'Coursework fork · in progress', text:'A public student fork of NsquaredLab’s Python and Marimo exercises. The current exercise is unfinished.', url:'https://github.com/mteyra/Applied-Programming-2026' },
];
