const fs = require('fs/promises');
const path = require('path');

const pastaUploadsTeste = path.resolve(__dirname, '..', '.tmp-image-upload-service');
process.env.UPLOADS_DIR = pastaUploadsTeste;

const {
    identificarFormatoImagem,
    persistirImagensDaRequisicao,
    removerArquivosDeUpload,
} = require('../../src/services/imageUploadService');

const pngValido = Buffer.from([
    137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82,
    0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0, 31, 21, 196, 137,
    0, 0, 0, 13, 73, 68, 65, 84, 8, 215, 99, 248, 207, 192, 240,
    31, 0, 5, 0, 1, 255, 114, 156, 82, 103, 0, 0, 0, 0, 73, 69,
    78, 68, 174, 66, 96, 130,
]);

function arquivo(buffer = pngValido, originalname = 'foto.png') {
    return { buffer, originalname, mimetype: 'image/png' };
}

describe('imageUploadService', () => {
    beforeEach(async () => {
        await fs.rm(pastaUploadsTeste, { recursive: true, force: true });
    });

    afterAll(async () => {
        await fs.rm(pastaUploadsTeste, { recursive: true, force: true });
        delete process.env.UPLOADS_DIR;
    });

    test('identifica somente imagens suportadas pela assinatura binaria', () => {
        expect(identificarFormatoImagem(pngValido)).toEqual(expect.objectContaining({
            extensao: '.png',
            mimeType: 'image/png',
        }));
        expect(identificarFormatoImagem(Buffer.from('texto com mimetype falso'))).toBeNull();
        expect(identificarFormatoImagem('nao e buffer')).toBeNull();
    });

    test('salva imagem valida com nome aleatorio e URL publica padronizada', async () => {
        const req = { file: arquivo() };

        const [salvo] = await persistirImagensDaRequisicao(req);

        expect(salvo.filename).toMatch(/^[A-Za-z0-9-]+\.png$/);
        expect(salvo.url).toMatch(/^\/uploads\/[A-Za-z0-9-]+\.png$/);
        await expect(fs.stat(salvo.path)).resolves.toEqual(expect.objectContaining({ isFile: expect.any(Function) }));
        expect(req.file).toEqual(salvo);
    });

    test('rejeita conteudo falso, extensao executavel e diretorio fora da lista permitida', async () => {
        await expect(persistirImagensDaRequisicao({
            file: arquivo(Buffer.from('nao sou imagem'), 'foto.jpg'),
        })).rejects.toMatchObject({ status: 400 });

        await expect(persistirImagensDaRequisicao({
            file: arquivo(pngValido, 'documento.exe.png'),
        })).rejects.toMatchObject({ status: 400 });

        await expect(persistirImagensDaRequisicao(
            { file: arquivo() },
            { directory: path.resolve(__dirname, '..', 'fora-da-pasta') }
        )).rejects.toThrow('Diretorio de upload nao permitido.');
    });

    test('remove somente arquivos localizados em diretorios de upload permitidos', async () => {
        const [salvo] = await persistirImagensDaRequisicao({ file: arquivo() });
        await removerArquivosDeUpload([
            salvo,
            { path: path.resolve(__dirname, '..', 'nao-remover.txt') },
        ]);

        await expect(fs.stat(salvo.path)).rejects.toMatchObject({ code: 'ENOENT' });
    });
});
