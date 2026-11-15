/**
 * Public profile content reconciled from the February 2026 CV, the November
 * 2026 LinkedIn export and the reviewed public project repositories.
 *
 * "Coursework" records a listed university course, not a grade or completion
 * claim. CS50 certificates and their encompassing professional certificate
 * refer to the same study; they are not additional courses. TUM's course is
 * represented once, under credentials. PH526x was informally audited.
 *
 * Icosagen's shadowing year and Hack-A-Bot's month differ between sources,
 * so those disputed date parts are omitted. No job title is inferred.
 * Private source documents and analysis stay outside this repository.
 */

const cvUrl = new URL('../assets/cv/marc-teyra-cv-2026-02.pdf', import.meta.url).href;

export const profile = {
  name: 'Marc Teyra Galiano',
  shortName: 'Marc',
  introduction: 'I study artificial intelligence, work at Siemens Healthineers, and build things that bring computation into practical problems.',
  degree: {
    title: 'B.Sc. Artificial Intelligence',
    institution: 'FAU Erlangen-Nürnberg',
    since: 'October 2025',
    focus: 'A biomedical direction: computation, biology and medicine.',
  },
  currentRole: {
    organisation: 'Siemens Healthineers',
    since: 'April 2026',
    text: 'I work at Siemens Healthineers alongside my degree.',
  },
  cv: {
    url: cvUrl,
    label: 'Read my CV',
    date: 'February 2026',
  },
  links: {
    github: 'https://github.com/mteyra',
    linkedin: 'https://www.linkedin.com/in/mteyra/',
  },
};

export const coursework = [
  {
    id: 'computation',
    title: 'Computation',
    kind: 'University coursework',
    items: [
      {
        id: 'algorithms-programming-data',
        title: 'Algorithms, Programming and Data Representation',
        code: 'ALGO-47598',
        status: 'Coursework',
      },
      {
        id: 'applied-programming',
        title: 'Applied Programming',
        code: null,
        status: 'Coursework',
      },
      {
        id: 'ai-perspectives',
        title: 'Artificial Intelligence Perspectives',
        code: 'AI-92405',
        status: 'Coursework',
      },
    ],
  },
  {
    id: 'biology-medicine',
    title: 'Biology & medicine',
    kind: 'University coursework',
    items: [
      {
        id: 'data-science-medicine-psychology',
        title: 'Applied Data Science in Medicine & Psychology',
        code: null,
        status: 'Coursework',
      },
      {
        id: 'molecular-biology',
        title: 'Introduction to Molecular Biology',
        code: null,
        status: 'Coursework',
      },
      {
        id: 'neuroanatomy-neurophysiology',
        title: 'Neuroanatomy and Neurophysiology',
        code: 'NEURO-92412',
        status: 'Coursework',
      },
      {
        id: 'neuromodulation-technologies',
        title: 'Physics and Chemistry of Neuromodulation Technologies',
        code: null,
        status: 'Coursework',
      },
      {
        id: 'computational-biology',
        title: 'Practical Skills in Computational Biology',
        code: null,
        status: 'Coursework',
      },
    ],
  },
  {
    id: 'independent-study',
    title: 'Independent study',
    kind: 'Online courses',
    items: [
      {
        id: 'cs50x',
        title: "CS50's Introduction to Computer Science",
        code: 'CS50x',
        institution: 'HarvardX / edX',
        status: 'Completed',
        date: 'December 2024',
        credentialId: 'cs50x-certificate',
      },
      {
        id: 'cs50p',
        title: "CS50's Introduction to Programming with Python",
        code: 'CS50P',
        institution: 'HarvardX / edX',
        status: 'Completed',
        date: 'December 2024',
        credentialId: 'cs50p-certificate',
      },
      {
        id: 'python-for-research',
        title: 'Using Python for Research',
        code: 'PH526x',
        institution: 'HarvardX / edX',
        status: 'Audited',
      },
    ],
  },
];

export const credentials = [
  {
    id: 'digitalisation-space',
    title: 'Digitalisation in Space Research',
    institution: 'Technical University of Munich',
    type: 'Verified course certificate',
    date: 'March 2025',
    url: 'https://coursera.org/share/86e99f9a072acd3909dc2b5da9a4ab8d',
    courseIds: [],
  },
  {
    id: 'computer-science-python',
    title: 'Computer Science for Python Programming',
    institution: 'HarvardX',
    type: 'Professional certificate',
    date: 'December 2024',
    url: 'https://credentials.edx.org/credentials/4b034a6c229842b3aace4b16784ae9e6/',
    courseIds: ['cs50x', 'cs50p'],
  },
  {
    id: 'cs50x-certificate',
    title: "CS50's Introduction to Computer Science",
    institution: 'HarvardX / edX',
    type: 'Verified course certificate',
    date: 'December 2024',
    url: 'https://courses.edx.org/certificates/7514a0b18ca34740938b57b60db21cc0',
    courseIds: ['cs50x'],
  },
  {
    id: 'cs50p-certificate',
    title: "CS50's Introduction to Programming with Python",
    institution: 'HarvardX / edX',
    type: 'Verified course certificate',
    date: 'December 2024',
    url: 'https://courses.edx.org/certificates/89a6ba468d544f408900cdee48f8f2f0',
    courseIds: ['cs50p'],
  },
];

export const experiences = [
  {
    id: 'hack-a-bot',
    title: 'Hack-A-Bot',
    organisation: 'BEST Erlangen',
    type: 'Team hackathon',
    date: '2026',
    contribution: 'Gesture interface, team leadership & final pitch',
    text: 'I led a team of five and built the gesture-control interface for a humanoid-robot concept in a cath-lab setting. My teammates developed voice control; we combined the systems for the final presentation.',
    outcome: 'Second place as a team.',
  },
  {
    id: 'zhaw-smart-systems',
    title: 'Gen AI Smart Systems',
    organisation: 'ZHAW',
    type: 'Collaborative workshop & prototype',
    date: 'December 2025',
    contribution: 'Team prototyping & interactive pitch',
    text: 'Our team developed a mobile app around distributed temperature sensors, using AI-assisted rapid prototyping. I led the interactive pitch to an industry partner while teammates demonstrated the prototype and answered questions.',
    outcome: 'A working team prototype and industry presentation.',
  },
  {
    id: 'eelisa-entrepreneurship',
    title: 'Entrepreneurship School',
    organisation: 'EELISA / FAU Digital Tech Academy',
    type: 'Selected programme',
    date: 'November 2025',
    contribution: 'Concept development, prototyping & team pitch',
    text: 'During a five-day programme, I worked with a team on a startup concept, a rapid prototype and a final pitch. The programme covered customer-centred innovation, value propositions, business design and presentation.',
    outcome: 'Second place in the team Best Pitch Award.',
  },
  {
    id: 'healthcare-hackathon-2025',
    title: 'Healthcare Hackathon Bayern',
    organisation: 'Medical Valley EMN',
    type: 'Team hackathon participation',
    date: 'November 2025',
    contribution: 'Medical-device access concept',
    text: 'Our team tackled a Siemens Healthineers challenge on secure, offline access to medical devices. Technical problems stopped our hardware showcase from working at the final demonstration.',
    outcome: 'A practical lesson in developing an idea and communicating it under time pressure.',
  },
  {
    id: 'pharmaceutical-scraper',
    title: 'Pharmaceutical data collection',
    organisation: 'CS50P project / Icosagen context',
    type: 'Independent programming project',
    date: '2024–25',
    contribution: 'Python development',
    text: 'I built a multithreaded BeautifulSoup scraper to gather pharmaceutical data across multiple pages. It combined my CS50P final project with a practical tool for Icosagen bioengineers.',
    outcome: 'A completed course project with a practical research use.',
  },
  {
    id: 'icosagen-shadowing',
    title: 'Antibody discovery & protein engineering',
    organisation: 'Icosagen',
    type: 'Labwork & work shadowing',
    date: null,
    contribution: 'Guided laboratory participation',
    text: 'For my IB Biology Extended Essay, I spent a month in a protein-engineering lab. I learned laboratory techniques, observed antibody-development workflows and contributed to a project under the team’s guidance.',
    outcome: 'First-hand experience of the laboratory context behind biomedical data.',
  },
  {
    id: 'veterinary-shadowing',
    title: 'Veterinary clinical shadowing',
    organisation: 'Estonian University of Life Sciences',
    type: 'Work shadowing',
    date: '2024',
    contribution: 'Clinical observation',
    text: 'I observed surgery, radiology and oncology alongside veterinary professionals, including how digital imaging supports diagnostic and treatment decisions.',
    outcome: 'Exposure to clinical protocols, anatomy and technology in care.',
  },
  {
    id: 'junior-game-jam',
    title: 'Junior Game Jam',
    organisation: 'University of Tartu Institute of Computer Science',
    type: '48-hour team project',
    date: '2022',
    contribution: 'Collaborative game development',
    text: 'Our team built a playable 3D first-person shooter using Unity, C# and Blender, with original music, custom visuals and enemy mechanics.',
    outcome: 'Eighth place as a team.',
  },
  {
    id: 'biological-data',
    title: 'Python for biological data',
    organisation: 'Independent learning & research assistance',
    type: 'Informal technical assistance',
    date: '2020',
    contribution: 'Data filtering, analysis & plotting',
    text: 'After auditing Using Python for Research, I wrote scripts to help a researcher filter and analyse biological datasets. I applied pandas, regular expressions and Matplotlib to a practical problem.',
    outcome: 'Programming applied to a real research workflow.',
  },
  {
    id: 'first-lego-league',
    title: 'FIRST LEGO League · Hydrodynamics',
    organisation: 'Team 34599',
    type: 'Team robotics competition',
    date: '2017–18',
    contribution: 'Robot programming, mechanical refinement & presentation',
    text: 'I helped design and program an autonomous LEGO Mindstorms EV3 robot for water-cycle-themed missions, and contributed to our research presentation.',
    outcome: 'Our team reached the provincial championships and earned a Presentation Award.',
  },
];

export const projects = [
  {
    id: 'nixcare',
    title: 'Nixcare',
    type: 'Released open-source tool',
    contribution: 'Creator & maintainer',
    text: 'I build tools for Nix diagnostics and maintenance: inspect the system, prepare an isolated update candidate, and choose when to activate it.',
    technologies: ['Python', 'Nix', 'NixOS', 'Home Manager'],
    url: 'https://mteyra.github.io/nixcare/',
    sourceUrl: 'https://github.com/mteyra/nixcare',
  },
  {
    id: 'aloha',
    title: 'Aloha Robotics',
    type: 'Team hackathon prototype',
    contribution: 'Web experiences & presentation development',
    text: 'Our team explored medical-device maintenance and human handovers. I contributed the interactive presentation, phone companion, arcade experiences and project website.',
    technologies: ['JavaScript', 'Web interfaces', 'Interactive presentation'],
    url: 'https://clschulzer.github.io/Aloha-Robotics-HH2.0/Presentation/hackathon/?s=3',
    sourceUrl: 'https://github.com/clschulzer/Aloha-Robotics-HH2.0',
  },
  {
    id: 'nixos-config',
    title: 'My NixOS setup',
    type: 'Personal system configuration',
    contribution: 'Configuration & hardware integration',
    text: 'My declarative working environment, including custom tablet-mode input controls and touchscreen recovery for a convertible laptop.',
    technologies: ['Nix', 'Python', 'Hyprland', 'Linux'],
    url: 'https://github.com/mteyra/nixos-config',
    sourceUrl: 'https://github.com/mteyra/nixos-config',
  },
  {
    id: 'cube-solver',
    title: 'An autonomous Rubik’s Cube solver',
    type: 'Completed personal robotics project',
    contribution: 'Mechanical design & programming',
    text: 'I built a LEGO Mindstorms robot that solves a 3×3 cube, adapting a solving algorithm into EV3 code and refining the grips, gearing and colour-sensor logic.',
    technologies: ['LEGO Mindstorms EV3', 'Robotics', 'Algorithms'],
    url: cvUrl,
    sourceUrl: null,
  },
];
