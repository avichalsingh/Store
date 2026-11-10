/**
 * Private paid prompt/caption payloads for Admin CMS only.
 * Server-only — never import from client components or shared browser modules.
 */
import "server-only";
import type { CaptionPackData, PromptData } from "@/catalog/productPayloads";

export type MarketplacePrivatePayload = {
  promptData?: Pick<
    PromptData,
    | "mainPrompt"
    | "negativePrompt"
    | "generationSettings"
    | "modelNotes"
    | "instructions"
  >;
  captionPackData?: CaptionPackData;
};

export const MARKETPLACE_PRIVATE_PAYLOADS: Record<
  string,
  MarketplacePrivatePayload
> = {
  "prod-prompt-001": {
    "promptData": {
      "mainPrompt": "Adorable stylized cartoon character, soft pastel palette, big expressive eyes, clean line art, cozy outfit details, studio lighting, consistent character sheet, multiple angles, ultra detailed, kid-friendly",
      "negativePrompt": "blurry, photoreal horror, text, watermark, extra limbs, lowres",
      "generationSettings": "CFG 6 · Steps 30 · Aspect 1:1 · Style: illustration",
      "modelNotes": "",
      "instructions": ""
    }
  },
  "prod-prompt-002": {
    "promptData": {
      "mainPrompt": "Viral cartoon reel still, exaggerated motion lines, punchy silhouette, bright saturated colors, 9:16 composition, strong facial reaction, social-first framing, high contrast",
      "negativePrompt": "dull colors, busy background text, watermark, blurry",
      "generationSettings": "CFG 5.5 · Steps 28 · Aspect 9:16",
      "modelNotes": "",
      "instructions": ""
    }
  },
  "prod-prompt-003": {
    "promptData": {
      "mainPrompt": "Pixar-style anthropomorphic food character, subsurface scattering, soft global illumination, charming personality, tiny limbs, glossy materials, cinematic three-point light, storybook appeal",
      "negativePrompt": "scary, grotesque, text logo, low detail, flat lighting",
      "generationSettings": "CFG 7 · Steps 32 · Aspect 1:1",
      "modelNotes": "",
      "instructions": ""
    }
  },
  "prod-prompt-004": {
    "promptData": {
      "mainPrompt": "Cinematic product advertisement, premium materials, controlled specular highlights, shallow depth of field, 85mm look, editorial color grade, clean negative space for copy",
      "negativePrompt": "clutter, watermark, distorted product, harsh flash",
      "generationSettings": "CFG 6 · Steps 30 · Aspect 4:5",
      "modelNotes": "",
      "instructions": ""
    }
  },
  "prod-prompt-005": {
    "promptData": {
      "mainPrompt": "Funny anthropomorphic object character, exaggerated facial expression, tiny sneakers, meme-ready pose, bright comic lighting, clean background, high readability at phone size",
      "negativePrompt": "scary, NSFW, text overlays, blurry edges",
      "generationSettings": "CFG 5 · Steps 26 · Aspect 1:1",
      "modelNotes": "",
      "instructions": ""
    }
  },
  "prod-prompt-006": {
    "promptData": {
      "mainPrompt": "Stylized Indian fashion character, contemporary ethnicwear, detailed fabric folds, warm festival lighting, elegant pose, editorial fashion framing, respectful cultural details, soft bokeh",
      "negativePrompt": "stereotype, low detail fabric, watermark, harsh shadows",
      "generationSettings": "CFG 6.5 · Steps 30 · Aspect 3:4",
      "modelNotes": "",
      "instructions": ""
    }
  },
  "prod-prompt-007": {
    "promptData": {
      "mainPrompt": "Original fantasy creature, crystalline accents, bioluminescent details, mystical atmosphere, painterly lighting, mythic silhouette, ultra detailed textures, epic yet approachable",
      "negativePrompt": "generic dragon clone, blurry, watermark, lowres",
      "generationSettings": "CFG 7 · Steps 34 · Aspect 4:5",
      "modelNotes": "",
      "instructions": ""
    }
  },
  "prod-prompt-008": {
    "promptData": {
      "mainPrompt": "Stylized AI photo transformation, preserve facial identity, cinematic color grade, soft skin, trendy portrait lighting, viral social aesthetic, sharp eyes, tasteful background blur",
      "negativePrompt": "identity drift, plastic skin, watermark, text",
      "generationSettings": "CFG 4.5 · Steps 28 · Strength 0.55 · Aspect 4:5",
      "modelNotes": "",
      "instructions": ""
    }
  },
  "prod-content-001": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "Wait for it… 👀",
          "hashtags": [
            "#reels",
            "#fyp",
            "#viralreels",
            "#waitforit",
            "#trending"
          ],
          "label": "Hook",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Don't scroll yet.",
          "hashtags": [
            "#dancereels",
            "#fypdance",
            "#viralmoves",
            "#reelsindia",
            "#pulsecheck"
          ],
          "label": "Hook",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "POV: the algorithm found you.",
          "hashtags": [
            "#contentcreator",
            "#reelsgrowth",
            "#creatorlife",
            "#shortform",
            "#socialmedia"
          ],
          "label": "POV",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "Save this before it trends.",
          "hashtags": [
            "#reelsinstagram",
            "#indiancreators",
            "#desicontent",
            "#mumbai",
            "#delhi"
          ],
          "label": "CTA",
          "notes": ""
        }
      ]
    }
  },
  "prod-content-002": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "My confidence vs my Wi-Fi.",
          "hashtags": [
            "#funnyreels",
            "#comedy",
            "#relatable",
            "#memesdaily",
            "#lol"
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Main character until I open my camera roll.",
          "hashtags": [
            "#meme",
            "#dankmemes",
            "#chaoticgood",
            "#unhinged",
            "#funnyvideos"
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "Professionally unserious.",
          "hashtags": [
            "#creatorhumor",
            "#skit",
            "#comedycontent",
            "#viralcomedy",
            "#funnyvideos"
          ],
          "label": "Short",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "Sorry for what my feet are about to do.",
          "hashtags": [
            "#funnyreels",
            "#dancecomedy",
            "#relatable",
            "#fyp",
            "#viral"
          ],
          "label": "Funny",
          "notes": ""
        }
      ]
    }
  },
  "prod-content-003": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "POV: soft launch energy.",
          "hashtags": [
            "#softlaunch",
            "#couplegoals",
            "#relationshipreels",
            "#love",
            "#us"
          ],
          "label": "POV",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "POV: the situationship got loud.",
          "hashtags": [
            "#pov",
            "#situationship",
            "#datinglife",
            "#relationship",
            "#feelings"
          ],
          "label": "POV",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "Sending this to someone specific.",
          "hashtags": [
            "#tagthem",
            "#sendthis",
            "#foryou",
            "#relatablelove",
            "#couples"
          ],
          "label": "Share",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "Soft launch. Hard feelings.",
          "hashtags": [
            "#softlaunch",
            "#pov",
            "#relationship",
            "#reels",
            "#viral"
          ],
          "label": "Short",
          "notes": ""
        }
      ]
    }
  },
  "prod-content-004": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "Made this in one prompt.",
          "hashtags": [
            "#aiart",
            "#aigenerated",
            "#midjourney",
            "#aiartists",
            "#generativeart"
          ],
          "label": "AI Art",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Prompt in comments if you want it.",
          "hashtags": [
            "#promptshare",
            "#aiprompt",
            "#stablediffusion",
            "#fluxai",
            "#aiartwork"
          ],
          "label": "Prompt share",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "Still can't believe this is AI.",
          "hashtags": [
            "#digitalart",
            "#conceptart",
            "#fantasyart",
            "#characterdesign",
            "#artcommunity"
          ],
          "label": "Discovery",
          "notes": ""
        }
      ]
    }
  },
  "prod-content-005": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "Posting through the plateau.",
          "hashtags": [
            "#fyp",
            "#viral",
            "#explore",
            "#reelsinstagram",
            "#foryoupage"
          ],
          "label": "Growth",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Small creator, loud ideas.",
          "hashtags": [
            "#contentcreator",
            "#creatorjourney",
            "#reelstips",
            "#growthhacks",
            "#createeveryday"
          ],
          "label": "Community",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "Engagement is a habit.",
          "hashtags": [
            "#creatorsupport",
            "#smallcreator",
            "#engagement",
            "#collab",
            "#creativecommunity"
          ],
          "label": "Engagement",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "Made for the India feed.",
          "hashtags": [
            "#indianreels",
            "#desicreator",
            "#reelsindia",
            "#instagood",
            "#dailyreels"
          ],
          "label": "Reach",
          "notes": ""
        }
      ]
    }
  },
  "prod-caption-001": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "Wait for it…",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Hook",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Don't scroll yet.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Hook",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "This hits different at 0:07.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Hook",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "You weren't ready for this.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Hook",
          "notes": ""
        },
        {
          "id": "item-5",
          "caption": "POV: the algorithm found you.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "POV",
          "notes": ""
        },
        {
          "id": "item-6",
          "caption": "Save this before it trends.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "CTA",
          "notes": ""
        },
        {
          "id": "item-7",
          "caption": "Tell me you felt that.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Engagement",
          "notes": ""
        },
        {
          "id": "item-8",
          "caption": "Watch till the last beat.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Hook",
          "notes": ""
        },
        {
          "id": "item-9",
          "caption": "This is your sign to post.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "CTA",
          "notes": ""
        },
        {
          "id": "item-10",
          "caption": "Okay but the timing though.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Flex",
          "notes": ""
        },
        {
          "id": "item-11",
          "caption": "If you know, you know.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Curiosity",
          "notes": ""
        },
        {
          "id": "item-12",
          "caption": "Replay and tell me your favorite part.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "CTA",
          "notes": ""
        }
      ]
    }
  },
  "prod-caption-002": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "Wait for the twist 👀",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Twist",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Plot twist incoming.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Twist",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "You thought this was going somewhere else.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Twist",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "The ending changes everything.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Twist",
          "notes": ""
        },
        {
          "id": "item-5",
          "caption": "Stay for the switch-up.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Hook",
          "notes": ""
        },
        {
          "id": "item-6",
          "caption": "I tricked you for 6 seconds.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-7",
          "caption": "Not the ending you expected.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Twist",
          "notes": ""
        },
        {
          "id": "item-8",
          "caption": "Rewind. You missed it.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "CTA",
          "notes": ""
        },
        {
          "id": "item-9",
          "caption": "The face at the end says it all.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Engagement",
          "notes": ""
        },
        {
          "id": "item-10",
          "caption": "This is why people rewatch.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Social proof",
          "notes": ""
        },
        {
          "id": "item-11",
          "caption": "Trust the process… then the drop.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-12",
          "caption": "Okay that was illegal.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-13",
          "caption": "Comment if you saw it coming.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Comment bait",
          "notes": ""
        },
        {
          "id": "item-14",
          "caption": "Second watch hits harder.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "CTA",
          "notes": ""
        }
      ]
    }
  },
  "prod-caption-003": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "You know this is about you.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Callout",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Sending this to someone specific.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Share",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "If this is us, just say so.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Relationship",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "Don't act like you didn't do this.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Callout",
          "notes": ""
        },
        {
          "id": "item-5",
          "caption": "Tag the person who owes you an apology.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Tag",
          "notes": ""
        },
        {
          "id": "item-6",
          "caption": "This one's for my situational friends.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-7",
          "caption": "Why does this feel personal?",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Curiosity",
          "notes": ""
        },
        {
          "id": "item-8",
          "caption": "I'm not naming names… but.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Mystery",
          "notes": ""
        },
        {
          "id": "item-9",
          "caption": "Share this to the group chat.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Share",
          "notes": ""
        },
        {
          "id": "item-10",
          "caption": "You either are this person or hate them.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Polarizing",
          "notes": ""
        },
        {
          "id": "item-11",
          "caption": "Quietly putting this on your story.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Soft callout",
          "notes": ""
        },
        {
          "id": "item-12",
          "caption": "Reply with 👀 if it's you.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Comment bait",
          "notes": ""
        }
      ]
    }
  },
  "prod-caption-004": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "POV: they texted 'we need to talk'.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "POV",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "POV: soft launch energy.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "POV",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "POV: the situationship got loud.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "POV",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "POV: green flags only.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "POV",
          "notes": ""
        },
        {
          "id": "item-5",
          "caption": "POV: mixed signals championship.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "POV",
          "notes": ""
        },
        {
          "id": "item-6",
          "caption": "Us when the song comes on.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Us",
          "notes": ""
        },
        {
          "id": "item-7",
          "caption": "This is what almost felt like.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Emotional",
          "notes": ""
        },
        {
          "id": "item-8",
          "caption": "Tell me this isn't your love language.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Engagement",
          "notes": ""
        },
        {
          "id": "item-9",
          "caption": "For the ones who stayed.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Emotional",
          "notes": ""
        },
        {
          "id": "item-10",
          "caption": "For the ones who left a read receipt.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-11",
          "caption": "Soft launch. Hard feelings.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Short",
          "notes": ""
        },
        {
          "id": "item-12",
          "caption": "If they wanted to, they would… dance.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-13",
          "caption": "Comment your relationship era.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Comment bait",
          "notes": ""
        },
        {
          "id": "item-14",
          "caption": "Save for when you need a caption fast.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "CTA",
          "notes": ""
        },
        {
          "id": "item-15",
          "caption": "This one hits at 1am.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Emotional",
          "notes": ""
        }
      ]
    }
  },
  "prod-caption-005": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "Some days are quieter than others.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Emotional",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Still healing. Still dancing.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Emotional",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "I outgrew the version that stayed silent.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Growth",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "Soft heart. Strong beat.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Short",
          "notes": ""
        },
        {
          "id": "item-5",
          "caption": "This is me choosing myself.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Growth",
          "notes": ""
        },
        {
          "id": "item-6",
          "caption": "Not dramatic. Just honest.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Emotional",
          "notes": ""
        },
        {
          "id": "item-7",
          "caption": "Feelings with choreography.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Creative",
          "notes": ""
        },
        {
          "id": "item-8",
          "caption": "I hope you find your people.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Warm",
          "notes": ""
        },
        {
          "id": "item-9",
          "caption": "The song understood me.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Emotional",
          "notes": ""
        },
        {
          "id": "item-10",
          "caption": "Grief, but make it graceful.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Deep",
          "notes": ""
        },
        {
          "id": "item-11",
          "caption": "Healing looks like movement.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Growth",
          "notes": ""
        },
        {
          "id": "item-12",
          "caption": "For anyone starting over this week.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Warm",
          "notes": ""
        }
      ]
    }
  },
  "prod-caption-006": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "My confidence vs my Wi-Fi.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Main character until I open my camera roll.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "Me explaining the vibe to my friends.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Relatable",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "Brain: sleep. Body: one more reel.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-5",
          "caption": "Professionally unserious.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Short",
          "notes": ""
        },
        {
          "id": "item-6",
          "caption": "I came for the beat, stayed for the chaos.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-7",
          "caption": "This is my Roman Empire.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Meme",
          "notes": ""
        },
        {
          "id": "item-8",
          "caption": "Not me romanticizing a 15-second clip.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Relatable",
          "notes": ""
        },
        {
          "id": "item-9",
          "caption": "Gym? No. Groove? Yes.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-10",
          "caption": "Adulting can wait. This cannot.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-11",
          "caption": "My toxic trait is this song.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        },
        {
          "id": "item-12",
          "caption": "Send this to your unhinged friend.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Share",
          "notes": ""
        },
        {
          "id": "item-13",
          "caption": "I fear I ate.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Flex",
          "notes": ""
        },
        {
          "id": "item-14",
          "caption": "Sorry for what my feet are about to do.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Funny",
          "notes": ""
        }
      ]
    }
  },
  "prod-caption-007": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "Be honest… did you expect that?",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Comment bait",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Rate this 1–10 in the comments.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Comment bait",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "Team A or Team B?",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Poll",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "Guess the move before it happens.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Engagement",
          "notes": ""
        },
        {
          "id": "item-5",
          "caption": "What's the first word that comes to mind?",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Comment bait",
          "notes": ""
        },
        {
          "id": "item-6",
          "caption": "Finish this caption:",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Comment bait",
          "notes": ""
        },
        {
          "id": "item-7",
          "caption": "Which part would you remake?",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Engagement",
          "notes": ""
        },
        {
          "id": "item-8",
          "caption": "Comment a song that matches this energy.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Comment bait",
          "notes": ""
        },
        {
          "id": "item-9",
          "caption": "Would you post this? Yes/No.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Poll",
          "notes": ""
        },
        {
          "id": "item-10",
          "caption": "Tag someone who needs this vibe.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Tag",
          "notes": ""
        },
        {
          "id": "item-11",
          "caption": "Hot take: this trend isn't dead.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Hot take",
          "notes": ""
        },
        {
          "id": "item-12",
          "caption": "Drop a 🔥 if you made it to the end.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Comment bait",
          "notes": ""
        }
      ]
    }
  },
  "prod-caption-008": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "Chapter 1: the hesitation.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "Chapter 2: the beat finds you.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "Chapter 3: you stop caring who's watching.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "Once upon a scroll…",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-5",
          "caption": "This started as a joke.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-6",
          "caption": "Then it became a habit.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-7",
          "caption": "Now it's a personality.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-8",
          "caption": "Little wins look like this.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-9",
          "caption": "I filmed this on a Tuesday that felt like forever.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-10",
          "caption": "Proof that practice leaves receipts.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-11",
          "caption": "From shy take to clean take.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-12",
          "caption": "The before/after is in the timing.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Story",
          "notes": ""
        },
        {
          "id": "item-13",
          "caption": "End scene.",
          "hashtags": [
            "",
            "",
            "",
            "",
            ""
          ],
          "label": "Short",
          "notes": ""
        }
      ]
    }
  },
  "prod-hashtag-001": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "",
          "hashtags": [
            "#reels",
            "#fyp",
            "#viralreels",
            "#explorepage",
            "#trending"
          ],
          "label": "Curiosity / Viral",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "",
          "hashtags": [
            "#dancereels",
            "#fypdance",
            "#viralmoves",
            "#reelsindia",
            "#pulsecheck"
          ],
          "label": "Dance Discovery",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "",
          "hashtags": [
            "#contentcreator",
            "#reelsgrowth",
            "#creatorlife",
            "#shortform",
            "#socialmedia"
          ],
          "label": "Creator Growth",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "",
          "hashtags": [
            "#reelsinstagram",
            "#indiancreators",
            "#desicontent",
            "#mumbai",
            "#delhi"
          ],
          "label": "India Reach",
          "notes": ""
        }
      ]
    }
  },
  "prod-hashtag-002": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "",
          "hashtags": [
            "#aiart",
            "#aigenerated",
            "#midjourney",
            "#aiartists",
            "#generativeart"
          ],
          "label": "AI Art Core",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "",
          "hashtags": [
            "#promptshare",
            "#aiprompt",
            "#stablediffusion",
            "#fluxai",
            "#aiartwork"
          ],
          "label": "Prompt Share",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "",
          "hashtags": [
            "#digitalart",
            "#conceptart",
            "#fantasyart",
            "#characterdesign",
            "#artcommunity"
          ],
          "label": "Visual Discovery",
          "notes": ""
        }
      ]
    }
  },
  "prod-hashtag-003": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "",
          "hashtags": [
            "#cuteart",
            "#kawaii",
            "#cutemascot",
            "#characterart",
            "#adorable"
          ],
          "label": "Cute Core",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "",
          "hashtags": [
            "#kidscontent",
            "#wholesome",
            "#softaesthetic",
            "#pastelart",
            "#cutecore"
          ],
          "label": "Kids & Soft",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "",
          "hashtags": [
            "#stickerart",
            "#emote",
            "#ocart",
            "#mascotdesign",
            "#cuteillustration"
          ],
          "label": "Sticker Ready",
          "notes": ""
        }
      ]
    }
  },
  "prod-hashtag-004": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "",
          "hashtags": [
            "#funnyreels",
            "#comedy",
            "#relatable",
            "#memesdaily",
            "#lol"
          ],
          "label": "Comedy Reach",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "",
          "hashtags": [
            "#meme",
            "#dankmemes",
            "#shitpost",
            "#chaoticgood",
            "#unhinged"
          ],
          "label": "Meme Energy",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "",
          "hashtags": [
            "#creatorhumor",
            "#skit",
            "#comedycontent",
            "#viralcomedy",
            "#funnyvideos"
          ],
          "label": "Creator Comedy",
          "notes": ""
        }
      ]
    }
  },
  "prod-hashtag-005": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "",
          "hashtags": [
            "#softlaunch",
            "#couplegoals",
            "#relationshipreels",
            "#love",
            "#us"
          ],
          "label": "Soft Launch",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "",
          "hashtags": [
            "#pov",
            "#situationship",
            "#datinglife",
            "#relationship",
            "#feelings"
          ],
          "label": "POV Love",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "",
          "hashtags": [
            "#tagthem",
            "#sendthis",
            "#foryou",
            "#relatablelove",
            "#couples"
          ],
          "label": "Share Triggers",
          "notes": ""
        }
      ]
    }
  },
  "prod-hashtag-006": {
    "captionPackData": {
      "items": [
        {
          "id": "item-1",
          "caption": "",
          "hashtags": [
            "#fyp",
            "#viral",
            "#explore",
            "#reelsinstagram",
            "#foryoupage"
          ],
          "label": "Reach",
          "notes": ""
        },
        {
          "id": "item-2",
          "caption": "",
          "hashtags": [
            "#contentcreator",
            "#creatorjourney",
            "#reelstips",
            "#growthhacks",
            "#createeveryday"
          ],
          "label": "Creator Niche",
          "notes": ""
        },
        {
          "id": "item-3",
          "caption": "",
          "hashtags": [
            "#creatorsupport",
            "#smallcreator",
            "#engagement",
            "#collab",
            "#creativecommunity"
          ],
          "label": "Community",
          "notes": ""
        },
        {
          "id": "item-4",
          "caption": "",
          "hashtags": [
            "#indianreels",
            "#desicreator",
            "#reelsindia",
            "#instagood",
            "#dailyreels"
          ],
          "label": "India Creators",
          "notes": ""
        }
      ]
    }
  }
} as Record<string, MarketplacePrivatePayload>;

export function listMarketplacePrivatePayloadIds(): string[] {
  return Object.keys(MARKETPLACE_PRIVATE_PAYLOADS);
}
