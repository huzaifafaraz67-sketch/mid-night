import { StoryChapter, NoteDocument, SecretEndingInfo } from './types';

export const STORY_CHAPTERS: StoryChapter[] = [
  {
    id: 0,
    title: 'Chapter 0: The Curfew Begins',
    timeString: '11:00 PM',
    subtitle: 'Apartment 4B, Kessler Row. Mom leaves for the packing plant.',
    objective: 'Read the rules taped to the fridge',
    narrativePrompt: '11:00 PM. The deadbolt clicks from the outside. Mom is on the overnight shift until 6:00 AM. Read the note Grandma left on the fridge.',
    loreClue: 'Mom made you promise to read the five rules out loud before opening anything in the kitchen.'
  },
  {
    id: 1,
    title: 'Chapter 1: The First Warmth',
    timeString: '11:15 PM',
    subtitle: 'Grandma left chicken and rice in the fridge. Heat dinner.',
    objective: 'Take the plate from the fridge and microwave it',
    narrativePrompt: 'There is a covered plate on the middle shelf. Warm it up in the microwave, then take a seat on the couch.',
    loreClue: 'Never open the fridge twice in the same hour. Keep mental track of every time the fridge door seals.'
  },
  {
    id: 2,
    title: 'Chapter 2: The Hallway Awakes',
    timeString: '12:30 AM',
    subtitle: 'The communal hallway light turns itself on.',
    objective: 'Turn off the hallway light switch, but DO NOT look down the hall',
    narrativePrompt: 'A low electric buzz hums through the north door. The hallway light has turned itself on. Rule 1: Do not look down the hallway while it is lit.',
    loreClue: 'Apartments 4C, 4D, 4E, and 4F have been condemned since the fire. Yet someone is walking between them.'
  },
  {
    id: 3,
    title: 'Chapter 3: The Calling Voice',
    timeString: '2:15 AM',
    subtitle: 'A voice from the kitchen calls your name.',
    objective: 'Hide immediately in the bedroom cupboard and latch the door',
    narrativePrompt: 'Your own name echoes from behind the kitchen counter, pitched just a fraction too high. Rule 3: Hide in the closet until it stops.',
    loreClue: 'The thing outside cannot enter on its own. It copies voices it overhears through the thin apartment doors.'
  },
  {
    id: 4,
    title: 'Chapter 4: Blackout at Kessler Row',
    timeString: '3:45 AM',
    subtitle: 'The transformer blows. The apartment is plunged into darkness.',
    objective: 'Use your flashlight carefully. Finish the midnight chores.',
    narrativePrompt: 'Total darkness. The fridge hum dies. The front door creaks open into the corridor. Conserve your flashlight battery.',
    loreClue: 'Past 4:00 AM, the hallway becomes hostile. Do not linger out in the open corridor.'
  },
  {
    id: 5,
    title: 'Chapter 5: The Deceptive Dawn',
    timeString: '5:15 AM',
    subtitle: 'The entity tries its most persuasive mimicry.',
    objective: 'Endure the 5 knock rounds in the closet until the true 6:00 AM',
    narrativePrompt: 'It knows dawn is approaching. It will knock and pretend to be Mom, Ada, and the delivery man. Do not open the front door before 6:00 AM.',
    loreClue: 'At exactly 6:00 AM, Mom will use her metal latch key first. Only then may the door be opened.'
  }
];

export const LORE_DOCUMENTS: Record<string, NoteDocument> = {
  rules: {
    id: 'rules',
    title: 'THE FIVE MIDNIGHT RULES',
    subtitle: 'Taped to the fridge door — Grandma\'s handwriting in blue ink',
    author: 'Grandma Vance',
    content: [
      '1. If the hallway light is ON, do not look down the hallway. It uses the light to gauge your gaze.',
      '2. Mom comes home at 6:00 AM. Anyone knocking before then is NOT Mom, no matter whose voice they use.',
      '3. If you hear your own name called from the kitchen, hide in the closet until it stops.',
      '4. Never open the fridge twice in the same hour. The latch sound carries down the shaft.',
      '5. Whatever is in the hallway must not learn that you can see it. If you stare, it stops pretending.',
      '6. Finish the list before you sleep: plate washed, curtain shut, TV and hallway switch OFF, deadbolt thrown.',
      '7. Inside the cupboard, latch the door from the inside. A latched door cannot be opened by it.'
    ],
    footer: 'Leo — I love you so much. Follow the list to the letter. Mom will be back before sunrise.'
  },
  adaDiary: {
    id: 'adaDiary',
    title: 'TORN DIARY SCRAP — 4C',
    subtitle: 'Found near the door jamb of Apartment 4C',
    author: 'Ada Miller (Age 14, Missing 2 Weeks)',
    content: [
      'October 14th — 1:45 AM',
      'Leo is sleeping. There is someone tapping on the mail slot with what sounds like long fingernails.',
      'They spoke through the gap. First they asked for Mrs. Vance, then they asked if Leo was alone.',
      'I looked through the peephole. Nobody was standing in front of the bulb, but the shadow under the door didn\'t move.',
      'Now it\'s whispering my mother\'s name. How does it know my mother? She\'s in Dayton.',
      'Someone is turning the doorknob. It has a key? No, it\'s just shaking the frame...'
    ],
    footer: 'The police found Ada\'s shoes resting outside 4C, laces tied, toes facing the blank concrete wall.'
  },
  plantSchedule: {
    id: 'plantSchedule',
    title: 'KESSLER MEAT PACKING ROSTER',
    subtitle: 'Shift Schedule pinned beside the wall phone',
    author: 'Plant Supervisor Miller',
    content: [
      'EMPLOYEE: Sarah Vance (Line 3 Cutting Floor)',
      'SHIFT TIME: 11:00 PM — 5:30 AM',
      'BUS TRANSIT: Route 14 departing Kessler Gate at 5:42 AM',
      'ESTIMATED ARRIVAL AT 4B: Exactly 6:00 AM to 6:05 AM',
      'NOTE: Any arrival before 6:00 AM is physically impossible due to facility security lockdown.'
    ],
    footer: 'Remember Sarah: Double-lock the deadbolt behind you.'
  },
  grandmaLetter: {
    id: 'grandmaLetter',
    title: 'NOTE ON THE WALL',
    subtitle: 'Ballpoint pen on yellow lined legal pad',
    author: 'Grandma',
    content: [
      'The hallway bulb is new. It turns itself on when it wants you to look.',
      'The cupboard latch works from the inside. Ada never used it because she panicked.',
      'It always knocks three times. Three is polite. Three is rehearsal.',
      'If it copies your voice, it has been listening against the drywall for weeks.',
      '4C, 4D, 4E, 4F are empty ruins. Whatever answers from them is borrowing their doors.'
    ],
    footer: 'Do the list, Leo. Every night. I will come over on Sunday after church. — Grandma'
  }
};

export const SECRET_ENDINGS: Record<string, SecretEndingInfo> = {
  guest: {
    endingNumber: 1,
    title: 'THE POLITE GUEST',
    description: 'You knocked three times on a door that has been condemned since the fire. Three knocks is polite. Three knocks is an invitation. Something on the other side knocked back, perfectly in rhythm, then said thank you in Grandma\'s voice as the tumblers turned.'
  },
  shoes: {
    endingNumber: 2,
    title: "ADA'S SHOES",
    description: 'At the dead end of the hallway, illuminated by your flashlight beam, you discovered a pair of small girl\'s shoes still neatly laced, pointing directly at the blank wall. Two weeks of dust, yet not a single footprint leading up to them. When you turned around, the hallway was longer.'
  },
  waited: {
    endingNumber: 3,
    title: 'THE ONE WHO WAITED',
    description: '6:00 AM arrived. The key rattled in the deadbolt, and Mom\'s genuine voice pleaded for you to open up. Paralyzed by fear, you stayed inside the cupboard with the latch fastened. Hours turned into days. The rules kept you safe, and kept you, and kept you forever.'
  },
  dark: {
    endingNumber: 4,
    title: 'DARK ADAPTED',
    description: 'Throughout five knocks, five hunts, and the terrifying blackout, you never once turned on your flashlight. The entity spent the whole night searching for a boy who gave off no light and made no sound. At 6:00 AM Mom hugged you, amazed you slept through the night in pitch black.'
  }
};
