const zlib = require('zlib');

const MAX_PIXELS = 25_000_000;
const MAX_RAW_IMAGE_BYTES = 100 * 1024 * 1024;

const MARCADORES_SOF_JPEG = new Set([
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf,
]);

function dimensoesSeguras(largura, altura) {
    return Number.isInteger(largura) &&
        Number.isInteger(altura) &&
        largura > 0 &&
        altura > 0 &&
        largura * altura <= MAX_PIXELS;
}

function jpegEstruturalmenteValido(buffer) {
    if (
        !Buffer.isBuffer(buffer) ||
        buffer.length < 20 ||
        buffer[0] !== 0xff ||
        buffer[1] !== 0xd8
    ) {
        return false;
    }

    let offset = 2;
    let encontrouSof = false;
    let encontrouScan = false;
    let dadosDeScan = 0;
    let emScan = false;

    while (offset < buffer.length) {
        if (emScan) {
            let encontrouMarcador = false;
            while (offset < buffer.length) {
                if (buffer[offset] !== 0xff) {
                    dadosDeScan += 1;
                    offset += 1;
                    continue;
                }

                const inicioMarcador = offset;
                while (offset < buffer.length && buffer[offset] === 0xff) {
                    offset += 1;
                }
                if (offset >= buffer.length) return false;

                const marcadorScan = buffer[offset];
                if (marcadorScan === 0x00) {
                    dadosDeScan += 1;
                    offset += 1;
                    continue;
                }
                if (marcadorScan >= 0xd0 && marcadorScan <= 0xd7) {
                    offset += 1;
                    continue;
                }

                offset = inicioMarcador;
                emScan = false;
                encontrouMarcador = true;
                break;
            }
            if (!encontrouMarcador) return false;
        }

        if (buffer[offset] !== 0xff) return false;
        while (offset < buffer.length && buffer[offset] === 0xff) {
            offset += 1;
        }
        if (offset >= buffer.length) return false;

        const marcador = buffer[offset];
        offset += 1;

        if (marcador === 0xd9) {
            return offset === buffer.length &&
                encontrouSof &&
                encontrouScan &&
                dadosDeScan > 0;
        }
        if (
            marcador === 0x00 ||
            marcador === 0xd8 ||
            marcador === 0x01 ||
            (marcador >= 0xd0 && marcador <= 0xd7)
        ) {
            return false;
        }
        if (offset + 2 > buffer.length) return false;

        const tamanhoSegmento = buffer.readUInt16BE(offset);
        if (tamanhoSegmento < 2 || offset + tamanhoSegmento > buffer.length) {
            return false;
        }

        const inicioDados = offset + 2;
        const fimSegmento = offset + tamanhoSegmento;

        if (MARCADORES_SOF_JPEG.has(marcador)) {
            if (tamanhoSegmento < 11 || inicioDados + 6 > fimSegmento) return false;
            const altura = buffer.readUInt16BE(inicioDados + 1);
            const largura = buffer.readUInt16BE(inicioDados + 3);
            const componentes = buffer[inicioDados + 5];
            if (
                !dimensoesSeguras(largura, altura) ||
                componentes < 1 ||
                componentes > 4 ||
                tamanhoSegmento !== 8 + (3 * componentes)
            ) {
                return false;
            }
            encontrouSof = true;
        }

        if (marcador === 0xda) {
            if (!encontrouSof || tamanhoSegmento < 8) return false;
            const componentes = buffer[inicioDados];
            if (
                componentes < 1 ||
                componentes > 4 ||
                tamanhoSegmento !== 6 + (2 * componentes)
            ) {
                return false;
            }
            encontrouScan = true;
            emScan = true;
        }

        offset = fimSegmento;
    }

    return false;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, indice) => {
    let valor = indice;
    for (let bit = 0; bit < 8; bit += 1) {
        valor = (valor & 1) !== 0
            ? 0xedb88320 ^ (valor >>> 1)
            : valor >>> 1;
    }
    return valor >>> 0;
});

function crc32(buffer, inicio, fim) {
    let crc = 0xffffffff;
    for (let indice = inicio; indice < fim; indice += 1) {
        crc = CRC_TABLE[(crc ^ buffer[indice]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ 0xffffffff) >>> 0;
}

function configuracaoPngValida(bitDepth, colorType) {
    const profundidades = {
        0: new Set([1, 2, 4, 8, 16]),
        2: new Set([8, 16]),
        3: new Set([1, 2, 4, 8]),
        4: new Set([8, 16]),
        6: new Set([8, 16]),
    };
    return profundidades[colorType]?.has(bitDepth) || false;
}

function canaisPng(colorType) {
    return {
        0: 1,
        2: 3,
        3: 1,
        4: 2,
        6: 4,
    }[colorType];
}

function tamanhoPassoAdam7(total, inicio, passo) {
    if (total <= inicio) return 0;
    return Math.ceil((total - inicio) / passo);
}

function linhasPng({ largura, altura, bitsPorPixel, interlace }) {
    if (interlace === 0) {
        return Array.from(
            { length: altura },
            () => Math.ceil((largura * bitsPorPixel) / 8)
        );
    }

    const passos = [
        [0, 0, 8, 8],
        [4, 0, 8, 8],
        [0, 4, 4, 8],
        [2, 0, 4, 4],
        [0, 2, 2, 4],
        [1, 0, 2, 2],
        [0, 1, 1, 2],
    ];
    const linhas = [];
    for (const [inicioX, inicioY, passoX, passoY] of passos) {
        const larguraPasso = tamanhoPassoAdam7(largura, inicioX, passoX);
        const alturaPasso = tamanhoPassoAdam7(altura, inicioY, passoY);
        if (larguraPasso === 0 || alturaPasso === 0) continue;
        const bytesLinha = Math.ceil((larguraPasso * bitsPorPixel) / 8);
        for (let linha = 0; linha < alturaPasso; linha += 1) {
            linhas.push(bytesLinha);
        }
    }
    return linhas;
}

function dadosPngDescomprimidosValidos(idatChunks, configuracao) {
    const linhas = linhasPng(configuracao);
    const tamanhoEsperado = linhas.reduce((total, bytes) => total + bytes + 1, 0);
    if (tamanhoEsperado <= 0 || tamanhoEsperado > MAX_RAW_IMAGE_BYTES) {
        return false;
    }

    let dados;
    try {
        dados = zlib.inflateSync(Buffer.concat(idatChunks), {
            maxOutputLength: tamanhoEsperado + 1,
        });
    } catch {
        return false;
    }
    if (dados.length !== tamanhoEsperado) return false;

    let offset = 0;
    for (const bytesLinha of linhas) {
        if (dados[offset] > 4) return false;
        offset += bytesLinha + 1;
    }
    return offset === dados.length;
}

function pngEstruturalmenteValido(buffer) {
    const assinatura = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    if (
        !Buffer.isBuffer(buffer) ||
        buffer.length < 45 ||
        !buffer.subarray(0, 8).equals(assinatura)
    ) {
        return false;
    }

    let offset = 8;
    let configuracao;
    let encontrouPlte = false;
    let encontrouIdat = false;
    let idatEncerrado = false;
    const idatChunks = [];
    const chunksCriticos = new Set(['IHDR', 'PLTE', 'IDAT', 'IEND']);

    while (offset + 12 <= buffer.length) {
        const tamanho = buffer.readUInt32BE(offset);
        const inicioTipo = offset + 4;
        const inicioDados = offset + 8;
        const fimDados = inicioDados + tamanho;
        const fimChunk = fimDados + 4;
        if (fimChunk > buffer.length) return false;

        const tipo = buffer.subarray(inicioTipo, inicioDados).toString('ascii');
        if (!/^[A-Za-z]{4}$/.test(tipo)) return false;
        if (
            tipo[0] === tipo[0].toUpperCase() &&
            !chunksCriticos.has(tipo)
        ) {
            return false;
        }

        const crcInformado = buffer.readUInt32BE(fimDados);
        if (crc32(buffer, inicioTipo, fimDados) !== crcInformado) return false;

        if (tipo === 'IHDR') {
            if (offset !== 8 || configuracao || tamanho !== 13) return false;
            const largura = buffer.readUInt32BE(inicioDados);
            const altura = buffer.readUInt32BE(inicioDados + 4);
            const bitDepth = buffer[inicioDados + 8];
            const colorType = buffer[inicioDados + 9];
            const compression = buffer[inicioDados + 10];
            const filter = buffer[inicioDados + 11];
            const interlace = buffer[inicioDados + 12];
            if (
                !dimensoesSeguras(largura, altura) ||
                !configuracaoPngValida(bitDepth, colorType) ||
                compression !== 0 ||
                filter !== 0 ||
                ![0, 1].includes(interlace)
            ) {
                return false;
            }
            configuracao = {
                largura,
                altura,
                bitsPorPixel: canaisPng(colorType) * bitDepth,
                interlace,
                colorType,
            };
        } else if (tipo === 'PLTE') {
            if (
                !configuracao ||
                encontrouIdat ||
                encontrouPlte ||
                tamanho === 0 ||
                tamanho % 3 !== 0 ||
                tamanho > 768
            ) {
                return false;
            }
            encontrouPlte = true;
        } else if (tipo === 'IDAT') {
            if (!configuracao || idatEncerrado || tamanho === 0) return false;
            encontrouIdat = true;
            idatChunks.push(buffer.subarray(inicioDados, fimDados));
        } else if (tipo === 'IEND') {
            if (
                !configuracao ||
                !encontrouIdat ||
                tamanho !== 0 ||
                fimChunk !== buffer.length ||
                (configuracao.colorType === 3 && !encontrouPlte)
            ) {
                return false;
            }
            return dadosPngDescomprimidosValidos(idatChunks, configuracao);
        } else if (encontrouIdat) {
            idatEncerrado = true;
        }

        offset = fimChunk;
    }

    return false;
}

function validarChunkVp8(buffer, inicio, tamanho) {
    if (tamanho <= 10 || inicio + tamanho > buffer.length) return false;
    if ((buffer[inicio] & 1) !== 0) return false;
    if (
        buffer[inicio + 3] !== 0x9d ||
        buffer[inicio + 4] !== 0x01 ||
        buffer[inicio + 5] !== 0x2a
    ) {
        return false;
    }
    const largura = buffer.readUInt16LE(inicio + 6) & 0x3fff;
    const altura = buffer.readUInt16LE(inicio + 8) & 0x3fff;
    return dimensoesSeguras(largura, altura);
}

function validarChunkVp8l(buffer, inicio, tamanho) {
    if (tamanho <= 5 || inicio + tamanho > buffer.length || buffer[inicio] !== 0x2f) {
        return false;
    }
    const bits = buffer.readUInt32LE(inicio + 1);
    const largura = (bits & 0x3fff) + 1;
    const altura = ((bits >>> 14) & 0x3fff) + 1;
    const versao = bits >>> 29;
    return versao === 0 && dimensoesSeguras(largura, altura);
}

function webpEstruturalmenteValido(buffer) {
    if (
        !Buffer.isBuffer(buffer) ||
        buffer.length < 30 ||
        buffer.subarray(0, 4).toString('ascii') !== 'RIFF' ||
        buffer.subarray(8, 12).toString('ascii') !== 'WEBP' ||
        buffer.readUInt32LE(4) + 8 !== buffer.length
    ) {
        return false;
    }

    const tiposPermitidos = new Set([
        'VP8 ', 'VP8L', 'VP8X', 'ALPH', 'ICCP', 'EXIF', 'XMP ',
    ]);
    let offset = 12;
    let encontrouImagem = false;
    let encontrouVp8x = false;

    while (offset + 8 <= buffer.length) {
        const tipo = buffer.subarray(offset, offset + 4).toString('ascii');
        const tamanho = buffer.readUInt32LE(offset + 4);
        const inicioDados = offset + 8;
        const fimDados = inicioDados + tamanho;
        const fimChunk = fimDados + (tamanho % 2);
        if (!tiposPermitidos.has(tipo) || fimChunk > buffer.length) return false;
        if (tamanho % 2 === 1 && buffer[fimDados] !== 0x00) return false;

        if (tipo === 'VP8X') {
            if (offset !== 12 || encontrouVp8x || tamanho !== 10) return false;
            const flags = buffer[inicioDados];
            if ((flags & 0xc3) !== 0) return false;
            const largura = buffer.readUIntLE(inicioDados + 4, 3) + 1;
            const altura = buffer.readUIntLE(inicioDados + 7, 3) + 1;
            if (!dimensoesSeguras(largura, altura)) return false;
            encontrouVp8x = true;
        } else if (tipo === 'VP8 ' || tipo === 'VP8L') {
            if (encontrouImagem) return false;
            const valido = tipo === 'VP8 '
                ? validarChunkVp8(buffer, inicioDados, tamanho)
                : validarChunkVp8l(buffer, inicioDados, tamanho);
            if (!valido) return false;
            encontrouImagem = true;
        }

        offset = fimChunk;
    }

    return offset === buffer.length && encontrouImagem;
}

module.exports = {
    jpegEstruturalmenteValido,
    pngEstruturalmenteValido,
    webpEstruturalmenteValido,
};
