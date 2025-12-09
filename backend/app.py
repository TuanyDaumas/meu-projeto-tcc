import os
import json
from flask import Flask, request, jsonify, url_for
from flask_cors import CORS
from dotenv import load_dotenv
import mysql.connector

# ============================================================
# CONFIGURAÇÃO DO AMBIENTE (.env)
# ============================================================
load_dotenv()  # Carrega variáveis do arquivo .env

DB_HOST = os.getenv("DB_HOST")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

print("DB_USER:", DB_USER)
print("DB_PASSWORD:", DB_PASSWORD)
print("DB_NAME:", DB_NAME)


# ============================================================
# INICIALIZAÇÃO DO FLASK
# ============================================================
app = Flask(__name__)
# Certifique-se de que a pasta 'static/fotos' exista no mesmo nível do app.py
CORS(app, resources={r"/*": {"origins": "*"}})  # Libera todas as origens

# ============================================================
# FUNÇÃO PARA CONEXÃO COM BANCO
# ============================================================
def get_db():
    return mysql.connector.connect(
        host=DB_HOST,
        user=DB_USER,
        password=DB_PASSWORD,
        database=DB_NAME
    )

# ============================================================
# ROTA: CADASTRO DE USUÁRIO
# ============================================================
@app.route("/cadastro", methods=["POST"])
def cadastro():
    nome = request.form.get("nome")
    email = request.form.get("email")
    senha = request.form.get("senha")
    perfil = request.form.get("perfil")
    # permitir perfil vazio (None) para decidir depois
    if perfil not in ["catequista", "catequizando"]:
        perfil = None
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)
        # Verifica se já existe usuário com esse email
        cursor.execute("SELECT id FROM usuarios WHERE email=%s", (email,))
        if cursor.fetchone():
            return jsonify({"ok": False, "message": "E-mail já cadastrado!"})

        # Insere usuário
        cursor.execute(
            "INSERT INTO usuarios (nome, email, senha, perfil) VALUES (%s, %s, %s, %s)",
            (nome, email, senha, perfil)
        )
        db.commit()

        # pega o ID do usuário recém-criado
        usuario_id = cursor.lastrowid

        # cria estatísticas zeradas automaticamente
        cursor.execute("""
            INSERT INTO estatisticas (usuario_id, dicas_usadas, total_acertos, total_erros, quizzes_feitos, facil, medio, dificil)
            VALUES (%s, 0, 0, 0, 0, 0, 0, 0)
        """, (usuario_id,))
        db.commit()
        return jsonify({"ok": True, "message": "Cadastro realizado com sucesso!"})
    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})
    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()

# ============================================================
# ROTA: LOGIN
# ============================================================
@app.route("/login", methods=["POST"])
def login():
    email = request.form.get("email")
    senha = request.form.get("senha")

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT id, nome, senha, perfil FROM usuarios WHERE email=%s", (email,))
        user = cursor.fetchone()

        if not user or user["senha"] != senha:
            return jsonify({"ok": False, "message": "E-mail ou senha incorretos!"})

        return jsonify({
            "ok": True,
            "message": "Login realizado com sucesso!",
            "user": {
                "id": user["id"],
                "nome": user["nome"],
                "perfil": user["perfil"]
            }
        })

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()

# ============================================================
# ROTA: RESET DE SENHA
# ============================================================
@app.route("/reset-senha", methods=["POST"])
def reset_senha():
    email = request.form.get("email")
    nova_senha = request.form.get("nova_senha")

    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute("UPDATE usuarios SET senha=%s WHERE email=%s", (nova_senha, email))
        db.commit()

        return jsonify({"ok": True, "message": "Senha atualizada com sucesso!"})

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()

# ============================================================
# ROTA: ADICIONAR PERGUNTA
# ============================================================
@app.route("/add-pergunta", methods=["POST"])
def add_pergunta():
    tema = request.form.get("tema")
    pergunta = request.form.get("pergunta")
    alternativas = request.form.get("alternativas")
    correta = request.form.get("correta")
    nivel = request.form.get("nivel")
    dica = request.form.get("dica")
    email_autor = request.form.get("email_autor")

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT id FROM usuarios WHERE email=%s", (email_autor,))
        autor = cursor.fetchone()
        if not autor:
            return jsonify({"ok": False, "message": "Usuário não encontrado!"})
        
        alternativas_json = json.dumps(alternativas.split(";"))
        cursor.execute("""
            INSERT INTO perguntas (tema, pergunta, alternativas, correta, nivel, dica, criado_por)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (tema, pergunta, alternativas_json, correta, nivel, dica, autor["id"]))

        db.commit()
        return jsonify({"ok": True, "message": "Pergunta registrada com sucesso!"})

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()
# ============================================================
# ROTA: MINHAS PERGUNTAS (listar perguntas do catequista)
# ============================================================
@app.route("/minhas-perguntas", methods=["GET"])
def minhas_perguntas():
    email = request.args.get("email")

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Buscar autor pelo email
        cursor.execute("SELECT id FROM usuarios WHERE email=%s", (email,))
        autor = cursor.fetchone()
        if not autor:
            return jsonify({"ok": False, "message": "Usuário não encontrado!"})

        # Buscar perguntas criadas por esse usuário
        cursor.execute("""
            SELECT id, tema, pergunta, nivel, alternativas, correta, dica
            FROM perguntas
            WHERE criado_por=%s
        """, (autor["id"],))
        perguntas = cursor.fetchall()

        # Converter alternativas JSON em lista
        for p in perguntas:
            p["alternativas"] = json.loads(p["alternativas"]) if p["alternativas"] else []

        return jsonify({"ok": True, "perguntas": perguntas})

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()
# ============================================================
# ROTA: EDITAR PERGUNTAS
# ============================================================
@app.route("/editar-pergunta", methods=["POST"])
def editar_pergunta():
    pergunta_id = request.form.get("id")
    tema = request.form.get("tema")
    pergunta = request.form.get("pergunta")
    alternativas = request.form.get("alternativas")
    correta = request.form.get("correta")
    nivel = request.form.get("nivel")
    dica = request.form.get("dica")

    try:
        db = get_db()
        cursor = db.cursor()

        alternativas_json = json.dumps(alternativas.split(";"))

        cursor.execute("""
            UPDATE perguntas
            SET tema=%s, pergunta=%s, alternativas=%s, correta=%s, nivel=%s, dica=%s
            WHERE id=%s
        """, (tema, pergunta, alternativas_json, correta, nivel, dica, pergunta_id))

        db.commit()
        return jsonify({"ok": True, "message": "Pergunta atualizada com sucesso!"})

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        cursor.close()
        db.close()
# ============================================================
# ROTA: EXCLUIR PERGUNTA
# ============================================================
@app.route("/excluir-pergunta", methods=["POST"])
def excluir_pergunta():
    pergunta_id = request.form.get("id")

    try:
        db = get_db()
        cursor = db.cursor()

        cursor.execute("DELETE FROM perguntas WHERE id=%s", (pergunta_id,))
        db.commit()

        return jsonify({"ok": True, "message": "Pergunta excluída com sucesso!"})

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        cursor.close()
        db.close()
# ============================================================
# ROTA: GET PERGUNTAS POR NÍVEL
# ============================================================
@app.route("/get-perguntas", methods=["GET"])
def get_perguntas():
    nivel = request.args.get("nivel", "").lower()

    if nivel not in ["facil", "medio", "dificil"]:
        return jsonify({"ok": False, "message": "Nível inválido!"})

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("SELECT * FROM perguntas WHERE nivel=%s", (nivel,))
        perguntas = cursor.fetchall()

        # Converte alternativas JSON para lista
        for p in perguntas:
            p["alternativas"] = json.loads(p["alternativas"])

        return jsonify({
            "ok": True,
            "perguntas": perguntas
        })

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()

# ============================================================
# ROTA: UPDATE ESTATÍSTICAS
# ============================================================
@app.route("/update-estatisticas", methods=["POST"])
def update_estatisticas():
    email = request.form.get("email")
    acertos = int(request.form.get("acertos", 0))  # conversão para inteiro
    erros = int(request.form.get("erros", 0))      # conversão para inteiro
    nivel = request.form.get("nivel")

    if nivel not in ["facil", "medio", "dificil"]:
        return jsonify({"ok": False, "message": "Nível inválido!"})

    try:
        db = get_db()
        cursor = db.cursor()

        # Busca o usuário pelo email
        cursor.execute("SELECT id FROM usuarios WHERE email=%s", (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"ok": False, "message": "Usuário não encontrado!"})

        usuario_id = user[0]

        # Verifica se já existe estatísticas para esse usuário
        cursor.execute("SELECT 1 FROM estatisticas WHERE usuario_id=%s", (usuario_id,))
        exists = cursor.fetchone()

        # Se não existir, cria estatísticas zeradas
        if not exists:
            cursor.execute("""
                INSERT INTO estatisticas (usuario_id, dicas_usadas, total_acertos, total_erros, quizzes_feitos, facil, medio, dificil)
                VALUES (%s, 0, 0, 0, 0, 0, 0, 0)
            """, (usuario_id,))
            db.commit()

        # Atualiza estatísticas acumulando valores
        cursor.execute(f"""
            UPDATE estatisticas
            SET total_acertos = total_acertos + %s,
                total_erros = total_erros + %s,
                quizzes_feitos = quizzes_feitos + 1,
                {nivel} = {nivel} + 1
            WHERE usuario_id = %s
        """, (acertos, erros, usuario_id))

        db.commit()
        return jsonify({"ok": True, "message": "Estatísticas atualizadas com sucesso!"})

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()
# ============================================================
# ROTA: CONTAR USO DE DICA (Dicas Usadas)
# ============================================================
@app.route("/contar-dica", methods=["POST"])
def contar_dica():
    # O JS está enviando JSON, então usamos request.get_json()
    data = request.get_json()
    email = data.get("email")

    if not email:
        return jsonify({"ok": False, "message": "Email não fornecido."}), 400

    try:
        db = get_db()
        cursor = db.cursor()

        # 1. Buscar o ID do usuário pelo email
        cursor.execute("SELECT id FROM usuarios WHERE email=%s", (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"ok": False, "message": "Usuário não encontrado."}), 404

        usuario_id = user[0]

        # 2. Atualizar a estatística (incrementar dicas_usadas em 1)
        cursor.execute("""
            UPDATE estatisticas
            SET dicas_usadas = dicas_usadas + 1
            WHERE usuario_id = %s
        """, (usuario_id,))

        db.commit()
        
        # 3. Retorno
        return jsonify({"ok": True, "message": "Uso da dica contabilizado."})

    except Exception as e:
        print(f"Erro ao contar dica: {e}")
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"}), 500

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()
# ============================================================
# ROTA: EDITAR PERFIL 
# ============================================================
@app.route("/editar-perfil", methods=["POST"])
def editar_perfil():
    email = request.form.get("email")
    novo_nome = request.form.get("nome")
    foto = request.files.get("foto")

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Atualiza nome se enviado
        if novo_nome:
            cursor.execute("UPDATE usuarios SET nome=%s WHERE email=%s", (novo_nome, email))

        if foto:
            # 1. Define o nome do arquivo (Corrigido: substitui caracteres especiais por '_')
            extensao = "png"
            
            # Cria um nome de arquivo seguro a partir do email (ex: pessoal_gmail_com.png)
            nome_base_seguro = email.replace('@', '_').replace('.', '_')
            nome_arquivo = f"{nome_base_seguro}.{extensao}"
            
            # 2. Define o caminho físico para salvar
            caminho_salvamento = os.path.join("static", "fotos", nome_arquivo)
            
            # 3. Salva o arquivo fisicamente no disco
            foto.save(caminho_salvamento)

            # 4. Cria a URL pública acessível pelo navegador
            from flask import url_for # Se não estiver no topo
            foto_url_db = url_for('static', filename=f"fotos/{nome_arquivo}", _external=False)
            
            # 5. Atualiza o DB com a URL pública
            cursor.execute("UPDATE usuarios SET foto_url=%s WHERE email=%s", (foto_url_db, email))
        db.commit()

        # Buscar usuário atualizado (inclui 'foto_url' na busca)
        cursor.execute("SELECT id, nome, email, perfil, foto_url FROM usuarios WHERE email=%s", (email,))
        user = cursor.fetchone()

        # Buscar estatísticas (necessário para o retorno do JSON)
        cursor.execute("""
            SELECT dicas_usadas, total_acertos, total_erros, quizzes_feitos, facil, medio, dificil
            FROM estatisticas
            WHERE usuario_id=%s
        """, (user["id"],))
        stats = cursor.fetchone() or {
             "dicas_usadas": 0, "total_acertos": 0, "total_erros": 0,
             "quizzes_feitos": 0, "facil": 0, "medio": 0, "dificil": 0
        }

        return jsonify({
            "ok": True,
            "message": "Perfil atualizado com sucesso!",
            # Retorna o objeto user completo com a nova foto_url
            "user": {
                "id": user["id"],
                "nome": user["nome"],
                "email": user["email"],
                "perfil": user["perfil"],
                "foto_url": user.get("foto_url") 
            },
            "estatisticas": stats
        })

    except Exception as e:
        print(f"Erro ao editar perfil: {e}") 
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()


# ============================================================
# ROTA: GET PERFIL (COMPLETA E FINAL)
# ============================================================
@app.route("/get-perfil", methods=["GET"])
def get_perfil():
    email = request.args.get("email")

    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        # Buscar usuário (AGORA INCLUI foto_url)
        cursor.execute("SELECT id, nome, email, perfil, foto_url FROM usuarios WHERE email=%s", (email,))
        user = cursor.fetchone()

        if not user:
            return jsonify({"ok": False, "message": "Usuário não encontrado!"})

        # Buscar estatísticas
        cursor.execute("""
            SELECT dicas_usadas, total_acertos, total_erros, quizzes_feitos, facil, medio, dificil
            FROM estatisticas
            WHERE usuario_id=%s
        """, (user["id"],))
        stats = cursor.fetchone()

        # Inicializa estatísticas zeradas se não houver registro
        if not stats:
            stats = {
                "dicas_usadas": 0,
                "total_acertos": 0,
                "total_erros": 0,
                "quizzes_feitos": 0,
                "facil": 0,
                "medio": 0,
                "dificil": 0
            }
        else:
            # Garante que todas as chaves existam
            for key in ["dicas_usadas", "total_acertos", "total_erros", "quizzes_feitos", "facil", "medio", "dificil"]:
                if key not in stats:
                    stats[key] = 0

        # Retorno ajustado para o frontend
        return jsonify({
            "ok": True,
            "user": {
                "id": user["id"],
                "nome": user["nome"],
                "email": user["email"],
                "perfil": user["perfil"],
                "foto_url": user.get("foto_url") 
            },
            "estatisticas": stats
        })

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()
            
# ============================================================
# ROTA: RESPOSTAS DOS USUÁRIOS (visão geral para catequista)
# ============================================================
@app.route("/respostas-usuarios", methods=["GET"])
def respostas_usuarios():
    try:
        db = get_db()
        cursor = db.cursor(dictionary=True)

        cursor.execute("""
            SELECT u.nome, u.email,
                    e.total_acertos, e.total_erros, e.quizzes_feitos,
                    e.facil, e.medio, e.dificil
            FROM usuarios u
            JOIN estatisticas e ON u.id = e.usuario_id
        """)
        usuarios = cursor.fetchall()

        return jsonify({"ok": True, "usuarios": usuarios})

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        cursor.close()
        db.close()
# ============================================================
# ROTA: ATUALIZAR PERFIL (Chamada pela tela tipo-conta.html)
# ============================================================
@app.route("/set-perfil", methods=["POST"])
def set_perfil():
    email = request.form.get("email")
    perfil = request.form.get("perfil")

    # Validação rigorosa dos perfis
    if perfil not in ["catequista", "catequizando"]:
        return jsonify({"ok": False, "message": "Perfil inválido."})

    try:
        db = get_db()
        cursor = db.cursor()

        # Atualiza o campo 'perfil' na tabela 'usuarios'
        cursor.execute(
            "UPDATE usuarios SET perfil=%s WHERE email=%s", 
            (perfil, email)
        )
        db.commit()

        # Verifica se alguma linha foi afetada
        if cursor.rowcount == 0:
            return jsonify({"ok": False, "message": "Usuário não encontrado ou perfil já definido."})
            
        return jsonify({"ok": True, "message": "Perfil atualizado com sucesso!"})

    except Exception as e:
        return jsonify({"ok": False, "message": f"Erro no servidor: {e}"})

    finally:
        if 'cursor' in locals():
            cursor.close()
        if 'db' in locals():
            db.close()
# ============================================================
# RUN
# ============================================================
if __name__ == "__main__":
    app.run(debug=True)