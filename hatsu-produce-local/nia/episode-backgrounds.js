// Official adv_dear scripts, episodes 11–20. Background preload declarations are not scene order.
// Extracted from local game resource scripts; per-script hashes are preserved below.
(function installNiaEpisodeBackgrounds(root) {
  "use strict";
  if (root.HatsuNiaEpisodeBackgrounds?.schemaVersion === 1) return;
  const plans = {
  "藤田琴音": {
    "11": {
      "script": "adv_dear_fktn_011.txt",
      "sha256": "a653427f069f451b929a191eda23af003bfefc21e0cf033347ebb0829aac53ea",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "3d-adv-toschool-00-00-evening"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "3d-adv-toschool-00-00-evening"
      ]
    },
    "12": {
      "script": "adv_dear_fktn_012.txt",
      "sha256": "394a6faafb5d608a2fc9c8fad436dcaf3f54dbd39a2e1c04181f2befee3f59c7",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_fktn_013.txt",
      "sha256": "29231632e02e2c5fc17eb7b3028962a1407151637b6b85f4440b49c70cd21dfb",
      "backgrounds": [
        "3d-adv-corridor-00-00-noon",
        "school-councilroom-00-noon",
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "3d-adv-corridor-00-00-noon",
        "school-councilroom-00-noon",
        "3d-adv-corridor-00-00-noon",
        "school-pclassroom-00-noon",
        "3d-adv-corridor-00-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_fktn_014.txt",
      "sha256": "10f6749f134776d2a4e2079ed3b0eb2c1264d1b9b16ed015376e636c6f0aa3e3",
      "backgrounds": [
        "outschool-jsnahouse-jsnaroom-00-noon"
      ],
      "sequence": [
        "outschool-jsnahouse-jsnaroom-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_fktn_015.txt",
      "sha256": "5abdef962ea0a6b907e032910f63b7a1fc6d9c5b4aaf7439ceaee13799cd4c5a",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_fktn_016.txt",
      "sha256": "5acaa6ea5605a83f343c6ca33e8cd9b1ccbd958b9441b1e3a35e7c1c19f1e340",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_fktn_017.txt",
      "sha256": "b9fba430ecb9a610947770883c782b18c226bdb43dc21e05f0089c31a1208d21",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_fktn_018.txt",
      "sha256": "7bf8beec41045f299577a3958d6f891443b025b410ef6146f94d8824650f2577",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "3d-adv-audition-00-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "3d-adv-audition-00-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_fktn_019.txt",
      "sha256": "e81e313c620e50097d8f8804c0966c7b799db2959999fa356531ef48a87ea9da",
      "backgrounds": [
        "3d-adv-audition-00-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_fktn_020.txt",
      "sha256": "a9025de4939563ce8e033145db053931369c126fe76851828a95c8115aed45d4",
      "backgrounds": [
        "other-audition-nia-00-evening"
      ],
      "sequence": [
        "other-audition-nia-00-evening"
      ]
    }
  },
  "月村手毬": {
    "11": {
      "script": "adv_dear_ttmr_011.txt",
      "sha256": "79a04af5fec6602772f65be46a8572d8fa614e93f2b27cc054db3afaf82f7a6a",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_ttmr_012.txt",
      "sha256": "0fe0836f5f87b9246a593bcff81611fee530cf66b92afab2674c9e12c8108328",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_ttmr_013.txt",
      "sha256": "f44d9e7411164f54630e98243c58d2ea44abfbe64f35a5f4321cbe76368f5981",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "other-outstage-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ],
      "branchSequences": [
        [
          "school-pclassroom-00-noon",
          "other-outstage-00-noon"
        ]
      ]
    },
    "14": {
      "script": "adv_dear_ttmr_014.txt",
      "sha256": "0b60ba70aa51935a60925b53c54584d53e1bba81fabbf97c439ecb416c9ad88d",
      "backgrounds": [
        "other-gokugetsugakuen-room-00-noon",
        "3d-adv-schoolgarden-00-00-noon",
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "other-gokugetsugakuen-room-00-noon",
        "3d-adv-schoolgarden-00-00-noon",
        "school-pclassroom-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_ttmr_015.txt",
      "sha256": "2089369d7dee8dc56be98c98274b182195c3454ba98bfe1d31901fe07f146023",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "other-outstage-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "other-outstage-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_ttmr_016.txt",
      "sha256": "5b370acae88aa51792ff755e2d386edc7a9130ecef9c4601f036d1004130ef7b",
      "backgrounds": [
        "other-audition-nia-00-noon"
      ],
      "sequence": [
        "other-audition-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_ttmr_017.txt",
      "sha256": "ccdf6df3630b357d0039808eb5c5664f8c998045b99b622ece866a38eba052bf",
      "backgrounds": [
        "outschool-cafe-00-evening",
        "3d-adv-toschool-00-00-noon"
      ],
      "sequence": [
        "outschool-cafe-00-evening",
        "3d-adv-toschool-00-00-noon",
        "outschool-cafe-00-evening"
      ]
    },
    "18": {
      "script": "adv_dear_ttmr_018.txt",
      "sha256": "a9c969a69ea4c1d026b1ac84d204f8db631a64dbf6e4fc009c5017cc8fdb2104",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_ttmr_019.txt",
      "sha256": "0502b2694408e714690c2598a2d6130fd4386f03fab9d5eb91ea02c1509fc930",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-evening"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-evening"
      ]
    },
    "20": {
      "script": "adv_dear_ttmr_020.txt",
      "sha256": "e8a3a657d5df453f2cea5089215447f8646d4515a5014a3f6e8bcf54ed4ef350",
      "backgrounds": [
        "other-audition-nia-00-noon",
        "school-classroom-00-noon",
        "3d-adv-hallway-00-00-noon",
        "other-audition-nia-00-evening",
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "other-audition-nia-00-noon",
        "school-classroom-00-noon",
        "other-audition-nia-00-noon",
        "3d-adv-hallway-00-00-noon",
        "other-audition-nia-00-evening",
        "school-pclassroom-00-noon",
        "other-audition-nia-00-evening"
      ]
    }
  },
  "花海咲季": {
    "11": {
      "script": "adv_dear_hski_011.txt",
      "sha256": "f3a887b6e77e38378196f75f77911dfdee3270494c114468a4f0257c61a42d27",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "3d-adv-sharedspace-00-00-noon",
        "3d-adv-waitingroom-00-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "3d-adv-sharedspace-00-00-noon",
        "3d-adv-waitingroom-00-00-noon",
        "3d-adv-sharedspace-00-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_hski_012.txt",
      "sha256": "c0868154cdca3c7c48e9bffc31c6d055970e2ddd88b18bd71da8c2de9db82a1c",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_hski_013.txt",
      "sha256": "560efad7e4e84f7d48dc41bf6103babf39647e4930967c2668df2f9ab6d57e15",
      "backgrounds": [
        "other-audition-nia-00-noon",
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-audition-nia-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_hski_014.txt",
      "sha256": "6efb0541b3f113c42eb54270bd8590596829e01562ae4bcd1149ca1df3b18669",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "3d-adv-hallway-00-00-noon",
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-evening"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "3d-adv-hallway-00-00-noon",
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-evening"
      ]
    },
    "15": {
      "script": "adv_dear_hski_015.txt",
      "sha256": "14808c68ba48e88045a074d1a9e89c365a7559be8b6743f07916c3e97785b949",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_hski_016.txt",
      "sha256": "8a3292e65e6db0422668b188dd3545db8423b02896340ca081969272b71248f7",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_hski_017.txt",
      "sha256": "0f09c7a2cc06dbae96abb94652b1e707d509aba9c8d2f4bf81842386eafa2496",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_hski_018.txt",
      "sha256": "1029593e105fa2181c0b98833d16073b26c3de7311209c1e038de3c3dffd69b6",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_hski_019.txt",
      "sha256": "7addbc051c3ba61535d3cfa307e2c9e2aa3ed02e8dcbf9b1e0f3dd5f5c0d0971",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_hski_020.txt",
      "sha256": "cc96af5524b7342c7de9df29c20ac517b5c87991b4a54c30b5189964d9b7ad1f",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    }
  },
  "花海佑芽": {
    "11": {
      "script": "adv_dear_hume_011.txt",
      "sha256": "6966dd4ed8ac3e9e950a773d103e5ce5c541521920d2a218aab822be19f39bd1",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_hume_012.txt",
      "sha256": "eef4db73a7bf05a4c51c94fcfdb591abd016d95780fc79d88888c7c127b1a800",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_hume_013.txt",
      "sha256": "d8695cec5a1934a5f597f57b5cf44ba06b508b4e262dff40e4326bbda6b1a528",
      "backgrounds": [
        "other-audition-nia-00-noon",
        "other-waitingroom-nia-00-noon",
        "3d-adv-hallway-00-00-noon"
      ],
      "sequence": [
        "other-audition-nia-00-noon",
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-noon",
        "other-waitingroom-nia-00-noon",
        "3d-adv-hallway-00-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_hume_014.txt",
      "sha256": "980dae7f38df07b657533df20986ac3d78f13b51766a5c431ad5005e743e6832",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_hume_015.txt",
      "sha256": "12c1b089352ddd8082d5aa5165b61f590ce27dc9a226d32a7476505a1b43ba21",
      "backgrounds": [
        "3d-adv-vocalroom-00-00-noon"
      ],
      "sequence": [
        "3d-adv-vocalroom-00-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_hume_016.txt",
      "sha256": "8f869893ec4d44829f708b976983e8b0de10454905394f8cdad897da036bc79c",
      "backgrounds": [
        "3d-adv-audition-00-00-noon",
        "3d-adv-hallway-00-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon",
        "3d-adv-hallway-00-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_hume_017.txt",
      "sha256": "6e3c46c2d9aac92a4e0bcf26948a8a0f6aeb1fe63925b4a1fce28ed8dde5e575",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_hume_018.txt",
      "sha256": "6591b9fde919eae367f8e6d2d03667ad562e3c418b4c2169c3aa867791eafcbb",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_hume_019.txt",
      "sha256": "b2f144dbbb976824149aa9bb3e575814135940cb1734431286b2980a22169e1e",
      "backgrounds": [
        "3d-adv-audition-00-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_hume_020.txt",
      "sha256": "0cb5c4f89b151cb9463868649b2090855276988dab1c42db9abb245e8e2b8d65",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    }
  },
  "筱泽广": {
    "11": {
      "script": "adv_dear_shro_011.txt",
      "sha256": "4739595748c3edced58ca72b23ddd182dca0bdcdbb1bb3b887c77fe946e8b947",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_shro_012.txt",
      "sha256": "25aaad52c2b8c7829c25901665d0eaeb6380fedc04961169a04e33b9e477a8fd",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_shro_013.txt",
      "sha256": "63aab18374e347bd3aa0d1c1ab36e5a13fd9cba702288ef1d1092caedf1e2402",
      "backgrounds": [
        "3d-adv-rooftop-00-00-noon"
      ],
      "sequence": [
        "3d-adv-rooftop-00-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_shro_014.txt",
      "sha256": "92605f2b35283749f6df08510d3a6314f715881a21da0231769246dbc88f7d9f",
      "backgrounds": [
        "3d-adv-hallway-00-00-noon"
      ],
      "sequence": [
        "3d-adv-hallway-00-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_shro_015.txt",
      "sha256": "a87c5ec0559a4978f4414db28574e024e2d46b44ed3ebbe3bfc331f52f9f2081",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_shro_016.txt",
      "sha256": "21722ffecd94a52a4c672a94af95bb31e62d30232ed0e698ce61ef2b2fbef71c",
      "backgrounds": [
        "3d-adv-audition-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_shro_017.txt",
      "sha256": "0235151f0ed04c1b92443fb38fbb9391c0e11b1b3d85d885c917e887cae3dd59",
      "backgrounds": [
        "outschool-sports-facilities-00-noon",
        "outschool-kcnahouse-kcnaroom-00-noon",
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "outschool-sports-facilities-00-noon",
        "outschool-kcnahouse-kcnaroom-00-noon",
        "school-pclassroom-00-noon",
        "outschool-kcnahouse-kcnaroom-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_shro_018.txt",
      "sha256": "49ab2480f25b026ee79073e0ffb724b85f99427ea3ece3691e182745dc0a1e74",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_shro_019.txt",
      "sha256": "2a27cb117ab0fd77e7dbf3cdc5d43d96688bec266bd655a77cb371e32f751c31",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_shro_020.txt",
      "sha256": "36cda7a18c4ef80a34cd5fa8ed3761b6776fd64429508e5ca172d6348cfff55d",
      "backgrounds": [
        "other-audition-nia-00-evening"
      ],
      "sequence": [
        "other-audition-nia-00-evening"
      ]
    }
  },
  "十王星南": {
    "11": {
      "script": "adv_dear_jsna_011.txt",
      "sha256": "32b437973c9c7327bf9b4e9a10b576066f374d4db27ceff8afd871b7ac767aa9",
      "backgrounds": [
        "school-councilroom-00-noon"
      ],
      "sequence": [
        "school-councilroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_jsna_012.txt",
      "sha256": "a818a95abcb6ae256020968c472ca00b75acc73a2f9841f6694754414c9ca533",
      "backgrounds": [
        "school-principal-00-noon",
        "other-gokugetsugakuen-room-00-noon",
        "school-councilroom-00-noon"
      ],
      "sequence": [
        "school-principal-00-noon",
        "other-gokugetsugakuen-room-00-noon",
        "school-principal-00-noon",
        "school-councilroom-00-noon",
        "school-principal-00-noon",
        "school-councilroom-00-noon",
        "school-principal-00-noon",
        "school-councilroom-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_jsna_013.txt",
      "sha256": "9bd8fff28db8dfe3da1e6f0e5f4ec67f3899f58260491e0d28e3489e7d789ce6",
      "backgrounds": [
        "school-councilroom-00-noon"
      ],
      "sequence": [
        "school-councilroom-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_jsna_014.txt",
      "sha256": "b0b5f3ddb5081446953d881de7968a103ecd396dc79c296736406bfa118e04dd",
      "backgrounds": [
        "school-councilroom-00-noon",
        "3d-adv-sharedspace-00-00-noon",
        "outschool-station-00-noon"
      ],
      "sequence": [
        "school-councilroom-00-noon",
        "3d-adv-sharedspace-00-00-noon",
        "outschool-station-00-noon",
        "school-councilroom-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_jsna_015.txt",
      "sha256": "3f42ee06d8d37c493994910fa5e4869c84252432c801e07722d0d71f20d7fd93",
      "backgrounds": [
        "other-outstage-00-noon"
      ],
      "sequence": [
        "other-outstage-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_jsna_016.txt",
      "sha256": "3930d8767ca2b98fc5721298302026fd8420ef9205c680788267d4ece2d60c80",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_jsna_017.txt",
      "sha256": "ec166ee70032aa239b81bc4cd2042c343c28646f705e052f7792d688abd691cb",
      "backgrounds": [
        "other-audition-nia-00-noon",
        "other-waitingroom-nia-00-noon",
        "school-councilroom-00-noon"
      ],
      "sequence": [
        "other-audition-nia-00-noon",
        "other-waitingroom-nia-00-noon",
        "school-councilroom-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_jsna_018.txt",
      "sha256": "93133c26eb59bdc45bad3c7941ad7f6ecce558d21cb3d2628a5e435459df1a92",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_jsna_019.txt",
      "sha256": "1590f87251c6226b5690b87d037851ed4588f3f235e42fe593251132cb1035d9",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_jsna_020.txt",
      "sha256": "ab13815c0396ce079dce803730dc19a7e2d626251aa5088dae307802bd4a77f6",
      "backgrounds": [
        "school-councilroom-00-noon",
        "3d-adv-toschool-00-00-noon"
      ],
      "sequence": [
        "school-councilroom-00-noon",
        "3d-adv-toschool-00-00-noon",
        "school-councilroom-00-noon"
      ]
    }
  },
  "秦谷美铃": {
    "11": {
      "script": "adv_dear_hmsz_011.txt",
      "sha256": "9b749b1a350497d34f81bb7a9ba1f7eba996b635207ce4137a833ed17f8802d1",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_hmsz_012.txt",
      "sha256": "74d10dd9ccde83bb8e2c64b2d1e92f32cbe5da99ed0090a4e48b1d8b9ca91189",
      "backgrounds": [
        "other-gokugetsugakuen-room-00-noon",
        "other-gokugetsugakuen-corridor-00-noon"
      ],
      "sequence": [
        "other-gokugetsugakuen-room-00-noon",
        "other-gokugetsugakuen-corridor-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_hmsz_013.txt",
      "sha256": "75d853b0fa6e6b1ed7e8cb5cfbd0878096eab48a0445c4be630ad34139448c96",
      "backgrounds": [
        "dormitory-ttmr-hmszroom-00-night"
      ],
      "sequence": [
        "dormitory-ttmr-hmszroom-00-night"
      ]
    },
    "14": {
      "script": "adv_dear_hmsz_014.txt",
      "sha256": "c6e2be3c6de86eebdaa67498c59ca877e4d62a9f89c200c28da35b581b31accd",
      "backgrounds": [
        "3d-adv-corridor-00-00-noon",
        "dormitory-ttmr-hmszroom-00-night",
        "3d-adv-vocalroom-00-00-noon"
      ],
      "sequence": [
        "3d-adv-corridor-00-00-noon",
        "dormitory-ttmr-hmszroom-00-night",
        "3d-adv-corridor-00-00-noon",
        "3d-adv-vocalroom-00-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_hmsz_015.txt",
      "sha256": "990a92f40554ffc11c048eb1fe715219d3be2720de7dd3cee5805efe03e07f12",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "3d-adv-hallway-00-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "3d-adv-hallway-00-00-noon",
        "school-pclassroom-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_hmsz_016.txt",
      "sha256": "74c4bbdb315abb1c8dc61a884e2939feae536904e6dfb06991fa8904fbadaa77",
      "backgrounds": [
        "3d-adv-hallway-00-00-noon"
      ],
      "sequence": [
        "3d-adv-hallway-00-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_hmsz_017.txt",
      "sha256": "01b0af7c3d43a05ffef849d670652172cc4437aa96f692a115c81f485f961981",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_hmsz_018.txt",
      "sha256": "c008320634b48b8311950a102611bdf82e070c4f4684e31ee76a656e958ad168",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_hmsz_019.txt",
      "sha256": "e81659b45ae6147d279d7f594a418d1c68884679b4cc88beee313a378b389a97",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_hmsz_020.txt",
      "sha256": "1dd38026a1ec8b46371ec9d95981425bae3697aa5a66b16fa58bdf68aef59e6e",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    }
  },
  "仓本千奈": {
    "11": {
      "script": "adv_dear_kcna_011.txt",
      "sha256": "c3908d7536c14a37d539039ddf2c7506421cc58ea85a4f942162b018fa8600ee",
      "backgrounds": [
        "outschool-kcnahouse-kcnaroom-00-noon"
      ],
      "sequence": [
        "outschool-kcnahouse-kcnaroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_kcna_012.txt",
      "sha256": "842df3937c602e326ef0983a489d066b4433b967bbee35561697efcac8977bda",
      "backgrounds": [
        "outschool-kcnahouse-kcnaroom-00-noon",
        "outschool-townstreet-00-noon"
      ],
      "sequence": [
        "outschool-kcnahouse-kcnaroom-00-noon",
        "outschool-townstreet-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_kcna_013.txt",
      "sha256": "096c7d0cda1eebdad6820e25927f999e39ee2c3cbf02b52e1e9411df59647308",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "3d-adv-corridor-00-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "3d-adv-corridor-00-00-noon",
        "school-pclassroom-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_kcna_014.txt",
      "sha256": "9f1fa3e914f09e5e621eec5b8d61c598e2e216c084efe755abc671742be255d5",
      "backgrounds": [
        "other-audition-nia-00-noon"
      ],
      "sequence": [
        "other-audition-nia-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_kcna_015.txt",
      "sha256": "d152b8f745f73ff75380a03e709e4acee4b2e51168e51411ff8256b79f8e13b8",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "outschool-kcnahouse-kcnaroom-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "outschool-kcnahouse-kcnaroom-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_kcna_016.txt",
      "sha256": "5f03a958335bb2b23a5cbd54b1c0d8c72c2ce87ef2721d47bc56e9091d254fae",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_kcna_017.txt",
      "sha256": "fe964c9c11f3061986b8bb6ba4939185f37739d6ca97bf807f6e8eec0bde6882",
      "backgrounds": [
        "outschool-kcnahouse-kcnaroom-00-noon"
      ],
      "sequence": [
        "outschool-kcnahouse-kcnaroom-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_kcna_018.txt",
      "sha256": "79e79e262086152af836f479910d0f6bb6a4430f56519bb1ba74ce057695c94b",
      "backgrounds": [
        "outschool-kcnahouse-kcnaroom-00-noon"
      ],
      "sequence": [
        "outschool-kcnahouse-kcnaroom-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_kcna_019.txt",
      "sha256": "4e8a170a13dbf05d915260985758308a63df6761c94806103f91c97cac0d607c",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_kcna_020.txt",
      "sha256": "9fc577f301afae9c2959a5afc067e23438da289dee0cb1e9f4eaab3c452e2071",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    }
  },
  "葛城莉莉娅": {
    "11": {
      "script": "adv_dear_kllj_011.txt",
      "sha256": "3e04dc7a53a78ee7b5641fa05a0d9d62e4933bff965e0a3ba328a852dea4b610",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_kllj_012.txt",
      "sha256": "7beb10dedf6a5fdd378470c4869b020f0408d3ad210858b9fbee4b256f283539",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "other-outstage-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "other-outstage-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_kllj_013.txt",
      "sha256": "018643735fa0136e425eb507eb2f3ec136c4a6d9d4bdb1e562ffba5d2545ae13",
      "backgrounds": [
        "3d-adv-danceroom-00-00-noon",
        "3d-adv-danceroom-00-00-night",
        "3d-adv-rooftop-00-00-noon"
      ],
      "sequence": [
        "3d-adv-danceroom-00-00-noon",
        "3d-adv-danceroom-00-00-night",
        "3d-adv-rooftop-00-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_kllj_014.txt",
      "sha256": "134b059269079bb415b43c887d622573f153f7d647740cba26830e9ca7feb525",
      "backgrounds": [
        "dormitory-kllj-ssmkroom-00-noon",
        "3d-adv-danceroom-00-00-night",
        "3d-adv-danceroom-00-00-noon"
      ],
      "sequence": [
        "dormitory-kllj-ssmkroom-00-noon",
        "3d-adv-danceroom-00-00-night",
        "dormitory-kllj-ssmkroom-00-noon",
        "3d-adv-danceroom-00-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_kllj_015.txt",
      "sha256": "9375586c2f7293ca39394537cc554245a95f0935a5e526839a31321971911002",
      "backgrounds": [
        "3d-adv-sharedspace-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "3d-adv-sharedspace-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_kllj_016.txt",
      "sha256": "285c88af9efaac3456c336786b4499b921d8d85785097fd552bc9e70c10a6972",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_kllj_017.txt",
      "sha256": "0b0bd9945d03409494647c789b93074d0bb965d45cc151a91fb164e3905ff5bf",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "3d-adv-danceroom-00-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "3d-adv-danceroom-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_kllj_018.txt",
      "sha256": "7dca3ca8f64117ce79ddd6959ae26fc0d23e91d6b14a7a6c10a257673ecbafeb",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_kllj_019.txt",
      "sha256": "472bcceaa0786205489280fd8f730ea856b604fe463a7e99b24d0c8b05696a51",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_kllj_020.txt",
      "sha256": "638d836faa870dc29af4a6d5516bef0b6dc280d93dedc301edbd1c38b3f48aed",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    }
  },
  "紫云清夏": {
    "11": {
      "script": "adv_dear_ssmk_011.txt",
      "sha256": "9ee3cd9b2e6ea8ca201f28be5c38e552b99374e8a8944087a60e19b7fe0ab561",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "3d-adv-corridor-00-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "3d-adv-corridor-00-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_ssmk_012.txt",
      "sha256": "69a962ac93cb60e45def2fa31a5a5f17a3e66ffff1f5ea636816f215dbed2815",
      "backgrounds": [
        "3d-adv-corridor-00-00-noon",
        "school-classroom-00-noon",
        "3d-adv-danceroom-00-00-noon",
        "3d-adv-toschool-00-00-evening",
        "3d-adv-toschool-00-00-night",
        "3d-adv-schoolgarden-00-00-noon"
      ],
      "sequence": [
        "3d-adv-corridor-00-00-noon",
        "school-classroom-00-noon",
        "3d-adv-corridor-00-00-noon",
        "3d-adv-danceroom-00-00-noon",
        "3d-adv-toschool-00-00-evening",
        "3d-adv-toschool-00-00-night",
        "school-classroom-00-noon",
        "3d-adv-schoolgarden-00-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_ssmk_013.txt",
      "sha256": "82360400acb2d2f9c67879f99f0e942fd4fe7770d46b92ba7fe708621463876e",
      "backgrounds": [
        "3d-adv-danceroom-00-00-noon",
        "3d-adv-toschool-00-00-evening",
        "dormitory-kllj-ssmkroom-00-night",
        "other-waitingroom-nia-00-noon",
        "other-outstage-00-noon"
      ],
      "sequence": [
        "3d-adv-danceroom-00-00-noon",
        "3d-adv-toschool-00-00-evening",
        "dormitory-kllj-ssmkroom-00-night",
        "other-waitingroom-nia-00-noon",
        "other-outstage-00-noon",
        "3d-adv-toschool-00-00-evening",
        "other-outstage-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_ssmk_014.txt",
      "sha256": "5e4f8065f9592485d1b8be3d0897b9e45f695571176fcd1bb4bc900cc45ff163",
      "backgrounds": [
        "3d-adv-toschool-00-00-noon",
        "3d-adv-rooftop-00-00-noon",
        "outschool-townstreet-00-evening"
      ],
      "sequence": [
        "3d-adv-toschool-00-00-noon",
        "3d-adv-rooftop-00-00-noon",
        "outschool-townstreet-00-evening",
        "3d-adv-rooftop-00-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_ssmk_015.txt",
      "sha256": "0676da66bfedc31738d8876edffa1b51c54b75a68624b2d0b5b8a081b656b230",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "3d-adv-audition-00-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "3d-adv-audition-00-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_ssmk_016.txt",
      "sha256": "16606d5cc02bb7aac0e037446fca8d84388e2c9ce2baacd6276f53618da96c1e",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "3d-adv-audition-00-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "3d-adv-audition-00-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_ssmk_017.txt",
      "sha256": "38b797f15c8bf6e52afcf8770677b3d1ad76bf7d5026bdeab6da67cf76dc3b0d",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_ssmk_018.txt",
      "sha256": "a3a41e3605a6d9238f1ef6575a90c0f2e82ef4b2b3f69345c95388f57b11abb6",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_ssmk_019.txt",
      "sha256": "8d77458879e6920f955faceeb0e7cae8df24444d4fb609662f385eefa42d523a",
      "backgrounds": [
        "3d-adv-audition-00-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_ssmk_020.txt",
      "sha256": "9a600861c2b67d891b236961716bc1fb8274dd91ea6eaeb1be8a7332bae8d289",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    }
  },
  "有村麻央": {
    "11": {
      "script": "adv_dear_amao_011.txt",
      "sha256": "7fc1bff57c692e4c4bc6aa7708b0b7d4ee9483b5dcf7972c9f67852189b54d62",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_amao_012.txt",
      "sha256": "f658fc14b6973473aa8003dc0014657198406c1632392bf98ba2965c515d27a5",
      "backgrounds": [
        "other-outstage-00-noon",
        "3d-adv-schoolgarden-00-00-evening",
        "3d-adv-toschool-00-00-night",
        "dormitory-gate-00-night",
        "dormitory-corridor-00-night"
      ],
      "sequence": [
        "other-outstage-00-noon",
        "3d-adv-schoolgarden-00-00-evening",
        "3d-adv-toschool-00-00-night",
        "dormitory-gate-00-night",
        "dormitory-corridor-00-night"
      ]
    },
    "13": {
      "script": "adv_dear_amao_013.txt",
      "sha256": "3bc1b25788c22a780b34fe7188070a130dcfd32bc587b0ad96a56ee16d90e7eb",
      "backgrounds": [
        "other-outstage-00-noon"
      ],
      "sequence": [
        "other-outstage-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_amao_014.txt",
      "sha256": "7f87b7c0c397537ce7053de9d0b2c99d6812bc4dad7d0ea3948e5ceeee14bce9",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_amao_015.txt",
      "sha256": "c7e701b4438391db66ac6b168d5d89bda4cc050d92855fcefcf3b0497bc81b12",
      "backgrounds": [
        "3d-adv-schoolroom-00-00-evening",
        "school-pclassroom-00-noon",
        "3d-adv-hallway-00-00-noon"
      ],
      "sequence": [
        "3d-adv-schoolroom-00-00-evening",
        "school-pclassroom-00-noon",
        "3d-adv-hallway-00-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_amao_016.txt",
      "sha256": "d7c065a1b1627ec7be684f2be658943fd19e3d4dc59ef8a4e017ce42bd3ad032",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_amao_017.txt",
      "sha256": "8a495fa2bf2319fdfa0be5d8984f4fb8e3f812bc72b536e6f6cd2389b850508f",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-evening"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-evening"
      ]
    },
    "18": {
      "script": "adv_dear_amao_018.txt",
      "sha256": "af5bb8d2115c5c0e12c766793c7a6542c65214190005b8a7945ba51a6566d903",
      "backgrounds": [
        "3d-adv-hallway-00-00-noon"
      ],
      "sequence": [
        "3d-adv-hallway-00-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_amao_019.txt",
      "sha256": "483e17d68ba1e0c1ba6dc71f562c7aa3430a464c228b4d6cbf98fc2bddaaae55",
      "backgrounds": [
        "3d-adv-audition-00-00-noon",
        "3d-adv-hallway-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon",
        "3d-adv-hallway-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_amao_020.txt",
      "sha256": "cd5baca258232e4b5b0221905b6d343cc50a877262fcf483ab87ea33e58f392f",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    }
  },
  "姬崎莉波": {
    "11": {
      "script": "adv_dear_hrnm_011.txt",
      "sha256": "35a353601e82c0aece0789727f052af273167f28523ddecc6ba61e95bd136d21",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_hrnm_012.txt",
      "sha256": "6ad2fc487cb99b2554106ce7ce4a2723ae1b2ac7ddf6b6d7283b4ee4a44d8485",
      "backgrounds": [
        "school-councilroom-00-noon",
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-councilroom-00-noon",
        "school-pclassroom-00-noon",
        "school-councilroom-00-noon",
        "school-pclassroom-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_hrnm_013.txt",
      "sha256": "005a37da6979474a26d78874c97e30b5886dcb9b8fc5e7b0d20aa2f00a38e3a8",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "school-entrance-00-noon",
        "school-councilroom-00-noon",
        "outschool-station-00-noon",
        "other-audition-nia-00-noon",
        "3d-adv-classroom-00-00-evening"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "school-entrance-00-noon",
        "school-councilroom-00-noon",
        "outschool-station-00-noon",
        "other-audition-nia-00-noon",
        "3d-adv-classroom-00-00-evening"
      ]
    },
    "14": {
      "script": "adv_dear_hrnm_014.txt",
      "sha256": "0f0703d9ab4ea347640c4c8c1313f401b7e8c4da7f98eb325db7bdaa505edee1",
      "backgrounds": [
        "3d-adv-hallway-00-00-noon"
      ],
      "sequence": [
        "3d-adv-hallway-00-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_hrnm_015.txt",
      "sha256": "23f93e43fe8255bf5d050227f2fd6406471daafc22c391964d4a7a97daff9134",
      "backgrounds": [
        "3d-adv-audition-00-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_hrnm_016.txt",
      "sha256": "487461a56ce508aedc2f86331bf481d5918080cd7c802194304ef77a68e4dc56",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_hrnm_017.txt",
      "sha256": "a76f185d02a5ed8d76304ad8cea73203918c2ee890c9f9dec7f376e25b06a35a",
      "backgrounds": [
        "3d-adv-audition-00-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_hrnm_018.txt",
      "sha256": "3af58f80c1cb6a202646dfc35fb62c72b910f9656340e62155f42fb6c52966ac",
      "backgrounds": [
        "3d-adv-audition-00-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_hrnm_019.txt",
      "sha256": "4a326dbe7c64bdb1eb2aec15c5a838688891b62c305e043e670db8c72000f10b",
      "backgrounds": [
        "3d-adv-audition-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "3d-adv-audition-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_hrnm_020.txt",
      "sha256": "8d68f5d3b43850391aba48237f107bfe4625e00ae2220970ad3aabf0dfc0cf59",
      "backgrounds": [
        "other-waitingroom-nia-00-noon",
        "outschool-summer-festival-00-night"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon",
        "outschool-summer-festival-00-night"
      ]
    }
  },
  "雨夜燕": {
    "11": {
      "script": "adv_dear_atbm_011.txt",
      "sha256": "b562ad65e5eac6f7248ca0a1531b0c5edb4a6485719e72d8c89720ada0b064ce",
      "backgrounds": [
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon"
      ]
    },
    "12": {
      "script": "adv_dear_atbm_012.txt",
      "sha256": "39c45b9f7d868bf07389e3839c261d1e141a418fbd0d6a6d58dec482009c0df1",
      "backgrounds": [
        "school-councilroom-00-noon"
      ],
      "sequence": [
        "school-councilroom-00-noon"
      ]
    },
    "13": {
      "script": "adv_dear_atbm_013.txt",
      "sha256": "d8e22b883b07b7198f064845cb24c83982860507b930185ea4c46ff90fd2facc",
      "backgrounds": [
        "3d-adv-danceroom-00-00-noon",
        "school-tearoom-00-noon",
        "school-pclassroom-00-noon",
        "other-audition-nia-00-noon"
      ],
      "sequence": [
        "3d-adv-danceroom-00-00-noon",
        "school-tearoom-00-noon",
        "school-pclassroom-00-noon",
        "other-audition-nia-00-noon"
      ]
    },
    "14": {
      "script": "adv_dear_atbm_014.txt",
      "sha256": "0c536c32500e35add572352cd5b5282f027278a89c105d4abbac8f10f83f8ef3",
      "backgrounds": [
        "3d-adv-danceroom-00-00-noon",
        "other-audition-nia-00-evening",
        "school-pclassroom-00-noon"
      ],
      "sequence": [
        "3d-adv-danceroom-00-00-noon",
        "other-audition-nia-00-evening",
        "school-pclassroom-00-noon"
      ]
    },
    "15": {
      "script": "adv_dear_atbm_015.txt",
      "sha256": "cd4b7cb2d0df57c807f1e5f088f73f554edbd3003d0d786e5182df7bce817d75",
      "backgrounds": [
        "school-pclassroom-00-noon",
        "other-audition-nia-00-noon"
      ],
      "sequence": [
        "school-pclassroom-00-noon",
        "other-audition-nia-00-noon"
      ]
    },
    "16": {
      "script": "adv_dear_atbm_016.txt",
      "sha256": "febfbe68572667d1646b58d1bbafc1440f3979788b03b3ceb43351a06c31d5dc",
      "backgrounds": [
        "other-audition-nia-00-noon",
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-audition-nia-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "17": {
      "script": "adv_dear_atbm_017.txt",
      "sha256": "93d4e06f0d159ee30feee8a370f25c01bcee3f08fe6362f94c6f4b85c16afaae",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    },
    "18": {
      "script": "adv_dear_atbm_018.txt",
      "sha256": "0ad13acd6a5629db31564ebc4d7d6b656cd95a4f74f98541cb7d64d30999005e",
      "backgrounds": [
        "3d-adv-hallway-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "3d-adv-hallway-00-00-noon",
        "other-waitingroom-nia-00-noon"
      ]
    },
    "19": {
      "script": "adv_dear_atbm_019.txt",
      "sha256": "ae6c65a9d27ad180f5d40d6ded01f59ee935a18e5d729adb49253786205118f8",
      "backgrounds": [
        "outschool-atbmhouse-atbmroom-00-night",
        "3d-adv-audition-00-00-noon",
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-noon"
      ],
      "sequence": [
        "outschool-atbmhouse-atbmroom-00-night",
        "3d-adv-audition-00-00-noon",
        "other-waitingroom-nia-00-noon",
        "other-audition-nia-00-noon"
      ]
    },
    "20": {
      "script": "adv_dear_atbm_020.txt",
      "sha256": "4219589f37d19541c68c6639cfcdee8a1d6feff1fed86e4a6e446cfcd253f1a8",
      "backgrounds": [
        "other-waitingroom-nia-00-noon"
      ],
      "sequence": [
        "other-waitingroom-nia-00-noon"
      ]
    }
  }
};

  function freeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(freeze);
    return Object.freeze(value);
  }
  freeze(plans);

  function get(idolName, episode) {
    return plans[String(idolName || "").trim()]?.[Number(episode)] || null;
  }

  function select(options = {}) {
    const idolName = String(options.idolName || options.route?.idolName || "").trim();
    const route = options.route || root.HatsuNiaRoutes?.getByIdol(idolName);
    if (route?.idolName && route.idolName !== idolName) return null;
    const episode = Number(options.episode) || Number(route?.episodes?.find(entry => entry.eventId === options.eventId)?.episode);
    const plan = get(idolName, episode);
    if (!plan) return null;
    const first = plan.sequence[0] || plan.backgrounds[0];
    const main = plan.sequence.join(" → ");
    const alternatives = plan.branchSequences?.length
      ? "本话有原作分支；分支内可用顺序：" + plan.branchSequences.map(sequence => sequence.join(" → ")).join("；") + "。按正在改写的分支使用，分支结束回到主线；不要把不同分支串成重复往返。"
      : "";
    return {
      category: "bond", context: "bond",
      planId: "nia-" + plan.script.match(/adv_dear_([a-z]+)_/)[1] + "-" + episode,
      sourceEpisodes: [episode],
      sourceScript: plan.script,
      defaultBackground: first,
      fixedBackgrounds: [...plan.backgrounds],
      backgroundGuidance: "原作主线场景顺序：" + main + "。" + alternatives
        + '第一段必须使用 background="' + first + '"，从这个实际地点开始。只有正文明确进入下一场景或相应回忆时才切换，未换场的Beat沿用当前背景；不能为了遍历名单虚构移动。保持标签指定时段，不因台词提到某地点就换背景。黑幕、天空与情绪效果是插入镜头，不作为人物对话地点；省略时保留所在场景。'
    };
  }

  function prompt(selection) {
    if (!selection) return "";
    return [
      "【本话官方背景规则】",
      "BEAT_BACKGROUND_EVENT=bond",
      "BEAT_BACKGROUND_CONTEXT=bond",
      "BEAT_BACKGROUND_PLAN=" + selection.planId,
      "BEAT_BACKGROUND_FIXED=" + selection.fixedBackgrounds.join("|"),
      "游戏脚本：" + selection.sourceScript,
      "本话仅允许以下 background（已包含时段，按原标签填写）：" + selection.fixedBackgrounds.join("、") + "。",
      selection.backgroundGuidance,
      "这份当话名单优先于通用交流、普通好感度或背景示例；不要调用其他偶像、其他话数的场景。"
    ].join("\n");
  }

  root.HatsuNiaEpisodeBackgrounds = Object.freeze({ schemaVersion: 1, get, select, prompt });
})(typeof globalThis !== "undefined" ? globalThis : this);
