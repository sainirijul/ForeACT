import zlib


def encode_plantuml(text: str) -> str:
    data = zlib.compress(
        text.encode("utf-8"),
        9,
    )[2:-4]

    return encode64(data)


def encode64(data: bytes) -> str:
    alphabet = (
        "0123456789"
        "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz"
        "-_"
    )

    result = []

    for i in range(0, len(data), 3):
        if i + 2 == len(data):
            result.append(append3bytes(
                data[i],
                data[i + 1],
                0,
                2,
                alphabet,
            ))
        elif i + 1 == len(data):
            result.append(append3bytes(
                data[i],
                0,
                0,
                1,
                alphabet,
            ))
        else:
            result.append(append3bytes(
                data[i],
                data[i + 1],
                data[i + 2],
                3,
                alphabet,
            ))

    return "".join(result)


def append3bytes(
    b1: int,
    b2: int,
    b3: int,
    count: int,
    alphabet: str,
) -> str:
    c1 = b1 >> 2
    c2 = ((b1 & 0x3) << 4) | (b2 >> 4)
    c3 = ((b2 & 0xF) << 2) | (b3 >> 6)
    c4 = b3 & 0x3F

    chars = [
        alphabet[c1 & 0x3F],
        alphabet[c2 & 0x3F],
        alphabet[c3 & 0x3F],
        alphabet[c4 & 0x3F],
    ]

    if count == 1:
        return chars[0] + chars[1]
    if count == 2:
        return chars[0] + chars[1] + chars[2]

    return "".join(chars)