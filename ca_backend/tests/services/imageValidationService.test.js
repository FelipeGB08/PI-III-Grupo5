const {
    jpegEstruturalmenteValido,
    pngEstruturalmenteValido,
    webpEstruturalmenteValido,
} = require('../../src/services/imageValidationService');

const jpegEstruturalValido = Buffer.from([
    0xff, 0xd8,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01,
    0x01, 0x01, 0x11, 0x00,
    0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00,
    0x00,
    0xff, 0xd9,
]);

const pngValido = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
    0, 0, 0, 13, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 240,
    31, 0, 5, 0, 1, 255, 114, 156, 82, 103, 0, 0, 0, 0, 73, 69,
    78, 68, 174, 66, 96, 130,
]);

function criarWebpVp8Minimo() {
    const buffer = Buffer.alloc(32);
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(24, 4);
    buffer.write('WEBP', 8);
    buffer.write('VP8 ', 12);
    buffer.writeUInt32LE(11, 16);
    Buffer.from([
        0x00, 0x00, 0x00,
        0x9d, 0x01, 0x2a,
        0x01, 0x00,
        0x01, 0x00,
        0x00,
    ]).copy(buffer, 20);
    return buffer;
}

describe('validacao estrutural do conteudo de imagens', () => {
    test('aceita JPEG com estrutura minima coerente e rejeita apenas a assinatura', () => {
        expect(jpegEstruturalmenteValido(jpegEstruturalValido)).toBe(true);
        expect(jpegEstruturalmenteValido(Buffer.from([0xff, 0xd8, 0xff]))).toBe(false);
    });

    test('valida chunks, CRC e dados descompactados do PNG', () => {
        expect(pngEstruturalmenteValido(pngValido)).toBe(true);

        const crcAdulterado = Buffer.from(pngValido);
        crcAdulterado[55] ^= 0xff;
        expect(pngEstruturalmenteValido(crcAdulterado)).toBe(false);
        expect(pngEstruturalmenteValido(pngValido.subarray(0, -4))).toBe(false);
    });

    test('valida container RIFF e quadro do WebP', () => {
        const webpValido = criarWebpVp8Minimo();
        expect(webpEstruturalmenteValido(webpValido)).toBe(true);

        const tamanhoRiffAdulterado = Buffer.from(webpValido);
        tamanhoRiffAdulterado.writeUInt32LE(20, 4);
        expect(webpEstruturalmenteValido(tamanhoRiffAdulterado)).toBe(false);
        expect(webpEstruturalmenteValido(Buffer.from('RIFF____WEBP', 'ascii'))).toBe(false);
    });
});
