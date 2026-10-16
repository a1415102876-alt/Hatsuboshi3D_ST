"""Offline generator; the deployed frontend needs no Python runtime.

Requires pyopenjtalk (or pyopenjtalk-plus on Windows).
Conversion follows Fish Audio's Japanese phoneme example:
https://docs.fish.audio/developer-guide/core-features/fine-grained-control/japanese
Readings come from the user; pitch is OpenJTalk's default, not game voice data.
"""
import json
import re

import pyopenjtalk


READINGS = [
    ("藤田ことね", "ふじた　ことね"),
    ("月村手毬", "つきむら　てまり"),
    ("花海咲季", "はなみ　さき"),
    ("秦谷美鈴", "はたや　みすず"),
    ("花海佑芽", "はなみ　うめ"),
    ("有村麻央", "ありむら　まお"),
    ("葛城リーリヤ", "かつらぎ　りーりや"),
    ("倉本千奈", "くらもと　ちな"),
    ("紫雲清夏", "しうん　すみか"),
    ("篠澤広", "しのさわ　ひろ"),
    ("姫崎莉波", "ひめさき　りなみ"),
    ("十王星南", "じゅうおう　せな"),
    ("雨夜燕", "あまや　つばめ"),
    ("初星", "はつぼし"),
    ("毬", "まり"),
]


def phonemes_with_pitch(text):
    labels = pyopenjtalk.extract_fullcontext(text)
    result = ""
    level = -1
    for index, label in enumerate(labels):
        phoneme = re.search(r"\-([^\+]*)\+", label).group(1)
        if phoneme in ("sil", "pau"):
            continue
        result += phoneme
        a1 = int(re.search(r"/A:(\-?[0-9]+)\+", label).group(1))
        a2 = int(re.search(r"\+(\d+)\+", label).group(1))
        a3 = int(re.search(r"\+(\d+)/", label).group(1))
        following = labels[index + 1]
        next_phoneme = re.search(r"\-([^\+]*)\+", following).group(1)
        a2_next = -1 if next_phoneme in ("sil", "pau") else int(re.search(r"\+(\d+)\+", following).group(1))
        if a3 == 1 and a2_next == 1:
            if level >= 0:
                result += str(level)
            level = -1
        elif a1 == 0 and a2_next == a2 + 1:
            level = 0
            result += "1"
        elif a2 == 1 and a2_next == 2:
            level = 1
            result += "0"
        elif phoneme in "aiueoAIUEON":
            if level < 0:
                level = 0
            result += str(level)
    return result


if __name__ == "__main__":
    assert phonemes_with_pitch("橋が") == "ha0shi1ga0"
    rules = [{"key": key, "reading": reading, "value": phonemes_with_pitch(reading)} for key, reading in READINGS]
    print(json.dumps(rules, ensure_ascii=False, indent=2))
