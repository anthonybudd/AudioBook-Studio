import { narrationSeconds, waveformFromText } from '@/lib/audio';
import type { Chapter, Project, Voice } from '@/lib/types';

export const voices: Voice[] = [
    { id: 'af_heart', name: 'Clara', detail: 'American · High Quality' },
];

const ago = (days: number, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3600000).toISOString();

function chapter(input: {
    id: string;
    title: string;
    text: string;
    voiceID: string;
    rendered?: boolean | string;
}): Chapter {
    const source = input.rendered === true ? input.text : typeof input.rendered === 'string' ? input.rendered : null;
    return {
        id: input.id,
        title: input.title,
        text: input.text,
        voiceID: input.voiceID,
        synthesizedText: source,
        synthesizedVoiceId: source === null ? null : input.voiceID,
        duration: source === null ? 0 : narrationSeconds(source),
        peaks: source === null ? [] : waveformFromText(source),
        gain: 1,
        audio: null,
    };
}

const prideOne = `It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.

However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.

"My dear Mr. Bennet," said his lady to him one day, "have you heard that Netherfield Park is let at last?"

Mr. Bennet replied that he had not.

"But it is," returned she, "for Mrs. Long has just been here, and she told me all about it."

Mr. Bennet made no answer.

"Do you not want to know who has taken it?" cried his wife impatiently.

"You want to tell me, and I have no objection to hearing it."`;

const prideTwoPrevious = `Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go; and till the evening after the visit was paid she had no knowledge of it.`;

const prideTwo = `Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go; and till the evening after the visit was paid she had no knowledge of it. It was then disclosed in the following manner. Observing his second daughter employed in trimming a hat, he suddenly addressed her with:

"I hope Mr. Bingley will like it, Lizzy."

"We are not in a way to know what Mr. Bingley likes," said her mother resentfully, "since we are not to visit."

"But you forget, mamma," said Elizabeth, "that we shall meet him at the assemblies, and that Mrs. Long promised to introduce him."`;

const prideThree = `"Come, Darcy," said he, "I must have you dance. I hate to see you standing about by yourself in this stupid manner. You had much better dance."

"I certainly shall not. You know how I detest it, unless I am particularly acquainted with my partner. At such an assembly as this it would be insupportable. Your sisters are engaged, and there is not another woman in the room whom it would not be a punishment to me to stand up with."

"I would not be so fastidious as you are," cried Mr. Bingley, "for a kingdom! Upon my honour, I never met with so many pleasant girls in my life as I have this evening; and there are several of them you see uncommonly pretty."`;

const frankensteinOne = `You will rejoice to hear that no disaster has accompanied the commencement of an enterprise which you have regarded with such evil forebodings. I arrived here yesterday, and my first task is to assure my dear sister of my welfare and increasing confidence in the success of my undertaking.

I am already far north of London, and as I walk in the streets of Petersburgh, I feel a cold northern breeze play upon my cheeks, which braces my nerves and fills me with delight. Do you understand this feeling? This breeze, which has travelled from the regions towards which I am advancing, gives me a foretaste of those icy climes. Inspirited by this wind of promise, my daydreams become more fervent and vivid.`;

const frankensteinTwo = `Last Monday (July 31st) we were nearly surrounded by ice, which closed in the ship on all sides, scarcely leaving her the sea-room in which she floated. Our situation was somewhat dangerous, especially as we were compassed round by a very thick fog. We accordingly lay to, hoping that some change would take place in the atmosphere and weather.

About two o'clock the mist cleared away, and we beheld, stretched out in every direction, vast and irregular plains of ice, which seemed to have no end. Some of my comrades groaned, and my own mind began to grow watchful with anxious thoughts, when a strange sight suddenly attracted our attention and diverted our solicitude from our own situation.`;

const frankensteinThree = `I am by birth a Genevese, and my family is one of the most distinguished of that republic. My ancestors had been for many years counsellors and syndics, and my father had filled several public situations with honour and reputation. He was respected by all who knew him for his integrity and indefatigable attention to public business.

One of his most intimate friends was a merchant who, from a flourishing state, fell, through numerous mischances, into poverty. This man, whose name was Beaufort, was of a proud and unbending disposition and could not bear to live in poverty and oblivion in the same country where he had formerly been distinguished for his rank and magnificence.`;

const aliceOne = `Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, "and what is the use of a book," thought Alice, "without pictures or conversations?"

So she was considering in her own mind (as well as she could, for the hot day made her feel very sleepy and stupid), whether the pleasure of making a daisy-chain would be worth the trouble of getting up and picking the daisies, when suddenly a White Rabbit with pink eyes ran close by her.`;

const aliceTwo = `There was nothing so very remarkable in that; nor did Alice think it so very much out of the way to hear the Rabbit say to itself, "Oh dear! Oh dear! I shall be late!" (when she thought it over afterwards, it occurred to her that she ought to have wondered at this, but at the time it all seemed quite natural); but when the Rabbit actually took a watch out of its waistcoat-pocket, and looked at it, and then hurried on, Alice started to her feet, for it flashed across her mind that she had never before seen a rabbit with either a waistcoat-pocket, or a watch to take out of it, and burning with curiosity, she ran across the field after it, and fortunately was just in time to see it pop down a large rabbit-hole under the hedge.`;

const mobyOne = `Call me Ishmael. Some years ago — never mind how long precisely — having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.

Whenever I find myself growing grim about the mouth; whenever it is a damp, drizzly November in my soul; whenever I find myself involuntarily pausing before coffin warehouses, and bringing up the rear of every funeral I meet; and especially whenever my hypos get such an upper hand of me, that it requires a strong moral principle to prevent me from deliberately stepping into the street, and methodically knocking people's hats off — then, I account it high time to get to sea as soon as I can.`;

const mobyTwo = `Though I cannot tell why it was exactly that those stage managers, the Fates, put me down for this shabby part of a whaling voyage, when others were set down for magnificent parts in high tragedies, and short and easy parts in genteel comedies, and jolly parts in farces — though I cannot tell why this was exactly; yet, now that I recall all the circumstances, I think I can see a little into the springs and motives which being cunningly presented to me under various disguises, induced me to set about performing the part I did, besides cajoling me into the delusion that it was a choice resulting from my own unbiased freewill and discriminating judgment.`;

const yellow = `It is very seldom that mere ordinary people like John and myself secure ancestral halls for the summer.

A colonial mansion, a hereditary estate, I would say a haunted house, and reach the height of romantic felicity — but that would be asking too much of fate!

Still I will proudly declare that there is something queer about it.

Else, why should it be let so cheaply? And why have stood so long untenanted?

John laughs at me, of course, but one expects that in marriage.

John is practical in the extreme. He has no patience with faith, an intense horror of superstition, and he scoffs openly at any talk of things not to be felt and seen and put down in figures.`;

const carolOne = `Marley was dead, to begin with. There is no doubt whatever about that. The register of his burial was signed by the clergyman, the clerk, the undertaker, and the chief mourner. Scrooge signed it. And Scrooge's name was good upon 'Change, for anything he chose to put his hand to.

Old Marley was as dead as a door-nail.

Mind! I don't mean to say that I know, of my own knowledge, what there is particularly dead about a door-nail. I might have been inclined, myself, to regard a coffin-nail as the deadest piece of ironmongery in the trade. But the wisdom of our ancestors is in the simile; and my unhallowed hands shall not disturb it, or the Country's done for.`;

const carolTwo = `Scrooge knew he was dead? Of course he did. How could it be otherwise? Scrooge and he were partners for I don't know how many years. Scrooge was his sole executor, his sole administrator, his sole assign, his sole residuary legatee, his sole friend, and sole mourner. And even Scrooge was not so dreadfully cut up by the sad event, but that he was an excellent man of business on the very day of the funeral, and solemnised it with an undoubted bargain.

The mention of Marley's funeral brings me back to the point I started from. There is no doubt that Marley was dead. This must be distinctly understood, or nothing wonderful can come of the story I am going to relate.`;

const carolThree = `Once upon a time — of all the good days in the year, on Christmas Eve — old Scrooge sat busy in his counting-house. It was cold, bleak, biting weather: foggy withal: and he could hear the people in the court outside go wheezing up and down, beating their hands upon their breasts, and stamping their feet upon the pavement stones to warm them. The city clocks had only just gone three, but it was quite dark already — it had not been light all day — and candles were flaring in the windows of the neighbouring offices, like ruddy smears upon the palpable brown air. The fog came pouring in at every chink and keyhole, and was so dense without, that although the court was of the narrowest, the houses opposite were mere phantoms.`;

export const projects: Project[] = [
    {
        id: 'p-pride',
        slug: 'pride-and-prejudice',
        title: 'Pride and Prejudice',
        author: 'Jane Austen',
        voiceID: 'clara',
        cover: 'wine',
        createdAt: ago(42),
        updatedAt: ago(0, 3),
        activechapterID: 'pnp-2',
        chapters: [
            chapter({ id: 'pnp-1', title: 'A Truth Universally Acknowledged', text: prideOne, voiceID: 'clara', rendered: true }),
            chapter({ id: 'pnp-2', title: 'Netherfield', text: prideTwo, voiceID: 'clara', rendered: prideTwoPrevious }),
            chapter({ id: 'pnp-3', title: 'The Assembly', text: prideThree, voiceID: 'clara', rendered: true }),
            chapter({ id: 'pnp-4', title: 'Chapter 4', text: '', voiceID: 'clara' }),
        ],
    },
    {
        id: 'p-frank',
        slug: 'frankenstein',
        title: 'Frankenstein',
        author: 'Mary Shelley',
        voiceID: 'owen',
        cover: 'moss',
        createdAt: ago(30),
        updatedAt: ago(1, 5),
        activechapterID: 'fr-1',
        chapters: [
            chapter({ id: 'fr-1', title: 'Letter I', text: frankensteinOne, voiceID: 'owen', rendered: true }),
            chapter({ id: 'fr-2', title: 'The Ice', text: frankensteinTwo, voiceID: 'owen', rendered: true }),
            chapter({ id: 'fr-3', title: 'The Genevese', text: frankensteinThree, voiceID: 'owen', rendered: true }),
        ],
    },
    {
        id: 'p-alice',
        slug: 'alices-adventures-in-wonderland',
        title: "Alice's Adventures in Wonderland",
        author: 'Lewis Carroll',
        voiceID: 'mara',
        cover: 'dusk',
        createdAt: ago(12),
        updatedAt: ago(2, 2),
        activechapterID: 'al-1',
        chapters: [
            chapter({ id: 'al-1', title: 'Down the Rabbit-Hole', text: aliceOne, voiceID: 'mara' }),
            chapter({ id: 'al-2', title: 'The Watch', text: aliceTwo, voiceID: 'mara' }),
        ],
    },
    {
        id: 'p-moby',
        slug: 'moby-dick',
        title: 'Moby-Dick',
        author: 'Herman Melville',
        voiceID: 'julian',
        cover: 'ink',
        createdAt: ago(18),
        updatedAt: ago(4),
        activechapterID: 'md-1',
        chapters: [
            chapter({ id: 'md-1', title: 'Loomings', text: mobyOne, voiceID: 'julian', rendered: true }),
            chapter({ id: 'md-2', title: 'The Carpet-Bag', text: mobyTwo, voiceID: 'julian', rendered: true }),
            chapter({ id: 'md-3', title: 'The Spouter-Inn', text: '', voiceID: 'julian' }),
        ],
    },
    {
        id: 'p-yellow',
        slug: 'the-yellow-wallpaper',
        title: 'The Yellow Wallpaper',
        author: 'Charlotte Perkins Gilman',
        voiceID: 'naomi',
        cover: 'sand',
        createdAt: ago(9),
        updatedAt: ago(6, 4),
        activechapterID: 'yw-1',
        chapters: [
            chapter({ id: 'yw-1', title: 'The Estate', text: yellow, voiceID: 'naomi' }),
        ],
    },
    {
        id: 'p-carol',
        slug: 'a-christmas-carol',
        title: 'A Christmas Carol',
        author: 'Charles Dickens',
        voiceID: 'theo',
        cover: 'copper',
        createdAt: ago(21),
        updatedAt: ago(8),
        activechapterID: 'cc-1',
        chapters: [
            chapter({ id: 'cc-1', title: 'Marley was Dead', text: carolOne, voiceID: 'theo', rendered: true }),
            chapter({ id: 'cc-2', title: 'The Partner', text: carolTwo, voiceID: 'theo', rendered: true }),
            chapter({ id: 'cc-3', title: 'The Counting-House', text: carolThree, voiceID: 'theo', rendered: true }),
        ],
    },
];
