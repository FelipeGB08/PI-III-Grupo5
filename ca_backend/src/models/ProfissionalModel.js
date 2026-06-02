const pool = require('../config/db');

const ProfissionalModel = {
    buscarPorProximidade: async (latCidadao, lngCidadao, categoriaId) => {
        let query = `
            SELECT 
                u.id, u.nome, u.cidade, 
                p.biografia, p.anos_experiencia,
                (6371 * acos(
                    cos(radians($1)) * cos(radians(u.latitude)) *
                    cos(radians(u.longitude) - radians($2)) +
                    sin(radians($1)) * sin(radians(u.latitude))
                )) AS distancia_km
            FROM usuarios u
            LEFT JOIN curriculos p ON u.id = p.profissional_id
        `;

        const valores = [latCidadao, lngCidadao];
        let index = 3;

        // Se o aplicativo mandar uma categoria, adicionamos o JOIN do filtro
        if (categoriaId) {
            query += `
            INNER JOIN profissional_categorias pc ON u.id = pc.profissional_id
            WHERE u.tipo_usuario = 'profissional' AND pc.categoria_id = $${index}
            `;
            valores.push(categoriaId);
        } else {
            query += ` WHERE u.tipo_usuario = 'profissional' `;
        }

        query += ` ORDER BY distancia_km ASC;`;

        const resultado = await pool.query(query, valores);
        return resultado.rows;
    }
};

module.exports = ProfissionalModel;