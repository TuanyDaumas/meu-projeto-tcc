// ============================================================
// VARIÁVEIS GLOBAIS
// ============================================================
let perguntas = [];
let indiceAtual = 0;
let acertos = 0;
let erros = 0;
let perguntaEditandoId = null; // controla se estamos editando

// Variáveis do localStorage que serão usadas em várias funções
const nivelSelecionado = (localStorage.getItem('nivelQuiz') || '').toLowerCase();
const emailUsuario = localStorage.getItem("usuario_email");
const perfilUsuario = localStorage.getItem("usuario_perfil");

// Elementos DOM do Quiz (Declarados aqui para serem acessíveis pelas funções)
const elQuizContainer = document.getElementById("quiz-container");
const elFeedback = document.getElementById("feedback");
const elDica = document.getElementById("dica");
const elBotaoDica = document.getElementById("mostrar-dica");
const elContador = document.getElementById("contador");
const elAcertos = document.getElementById("acertos");
const elErros = document.getElementById("erros");
const elProgressBar = document.getElementById("progress-bar");

// ============================================================
// DOMContentLoaded (Inicialização de listeners e lógica principal)
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Efeito de digitação na tela inicial
  const targetElement = document.getElementById('typing-text');
  const phrase = "Aprenda e divirta-se com desafios interativos";
  let charIndex = 0;
  const typingSpeed = 70;
  function typeWriter() {
    if (targetElement && charIndex < phrase.length) {
      targetElement.textContent += phrase.charAt(charIndex);
      charIndex++;
      setTimeout(typeWriter, typingSpeed);
    }
  }
  if (targetElement) {
    targetElement.setAttribute('aria-live', 'polite');
    targetElement.setAttribute('role', 'status');
    typeWriter();
  }

  // 2. Login
  const loginForm = document.getElementById('login-form');
  const feedbackLogin = document.getElementById('login-feedback');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(loginForm);
      try {
        const response = await fetch("http://127.0.0.1:5000/login", { method: "POST", body: formData });
        const result = await response.json();
        if (result.ok) {
          feedbackLogin.textContent = result.message;
          feedbackLogin.className = "feedback success";
          localStorage.setItem("usuario_email", formData.get("email"));
          localStorage.setItem("usuario_nome", result.user.nome);
          localStorage.setItem("usuario_perfil", result.user.perfil);
          setTimeout(() => {
            if (result.user.perfil === "catequista") {
              window.location.href = "catequista.html";
            } else if (result.user.perfil === "catequizando") {
              window.location.href = "pessoal.html";
            } else {
              window.location.href = "tipo-de-conta.html";
            }
          }, 1500);
        } else {
          feedbackLogin.textContent = result.message;
          feedbackLogin.className = "feedback error";
        }
      } catch {
        feedbackLogin.textContent = "Erro de conexão com o servidor.";
        feedbackLogin.className = "feedback error";
      }
    });
  }

  // 3. Verificação de nível para o quiz
  if (!nivelSelecionado && window.location.pathname.includes("quiz.html")) {
    console.warn("Nível não selecionado. Redirecionando para a tela de escolha de nível.");
    window.location.href = "pessoal.html";
    return;
  }

  // 4. Cadastro
 const registerForm = document.getElementById('register-form');
const feedbackCadastro = document.getElementById('cadastro-feedback');
const modalSucesso = document.getElementById('modal-sucesso');

if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById("nome").value.trim();
    const sobrenome = document.getElementById("sobrenome").value.trim();
    const email = document.getElementById("email").value.trim();
    const senha = document.getElementById("senha").value;
    const confirmar = document.getElementById("confirmar").value;

    if (senha !== confirmar) {
      feedbackCadastro.textContent = "As senhas não coincidem.";
      feedbackCadastro.className = "feedback error";
      return;
    }

    const formData = new FormData();
    formData.append("nome", `${nome} ${sobrenome}`);
    formData.append("email", email);
    formData.append("senha", senha);

    try {
      const response = await fetch("http://127.0.0.1:5000/cadastro", { method: "POST", body: formData });
      const result = await response.json();

      if (result.ok) {
        feedbackCadastro.textContent = result.message;
        feedbackCadastro.className = "feedback success";
        modalSucesso.classList.remove("hidden");

        //Salva email no localStorage
        localStorage.setItem("usuario_email", email);

        setTimeout(() => {
          modalSucesso.classList.add("hidden");
          window.location.href = "tipo-de-conta.html";
        }, 2000);
      } else {
        feedbackCadastro.textContent = result.message;
        feedbackCadastro.className = "feedback error";
      }
    } catch {
      feedbackCadastro.textContent = "Erro de conexão com o servidor.";
      feedbackCadastro.className = "feedback error";
    }
  });
}

  // 5. Reset de senha
const resetForm = document.getElementById("reset-form");
const feedbackSenha = document.getElementById("password-feedback");

if (resetForm) {
  resetForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value.trim();
    const novaSenha = document.getElementById("nova_senha").value;
    const confirmarSenha = document.getElementById("confirmar-senha").value;

    if (novaSenha !== confirmarSenha || novaSenha.length < 6) {
      feedbackSenha.textContent = "A senha deve ter pelo menos 6 caracteres e ser igual nos dois campos.";
      feedbackSenha.className = "feedback error";
      return;
    }

    const formData = new FormData();
    formData.append("email", email);
    formData.append("nova_senha", novaSenha);

    try {
      const response = await fetch("http://127.0.0.1:5000/reset-senha", { method: "POST", body: formData });
      const result = await response.json();
      if (result.ok) {
        feedbackSenha.textContent = result.message;
        feedbackSenha.className = "feedback success";
        setTimeout(() => window.location.href = "login.html", 2000);
      } else {
        feedbackSenha.textContent = result.message;
        feedbackSenha.className = "feedback error";
      }
    } catch {
      feedbackSenha.textContent = "Erro de conexão com o servidor.";
      feedbackSenha.className = "feedback error";
    }
  });
}
  // 6. Preparação da seleção de nível (limpa nível salvo ao abrir pessoal.html)
  function prepararSelecaoNivel() {
    if (window.location.pathname.includes("pessoal.html")) {
      localStorage.removeItem('nivelQuiz');
    }
  }
  prepararSelecaoNivel();

  // 7. Inicializações específicas
  // Quiz
  if (window.location.pathname.includes("quiz.html")) {
    if (elBotaoDica) {
      elBotaoDica.addEventListener("click", mostrarDica);
    }
    carregarPerguntasQuiz();
  }

  // Painel do Catequista: Perguntas
  if (document.querySelector("#tabela-perguntas")) {
    carregarPerguntas();
  }

  // Painel do Catequista: Visão geral dos catequizandos
  if (document.querySelector(".catequizandos-list")) {
    carregarCatequizandos();
  }

  // Painel do Catequista: Listener do formulário de cadastro/edição de perguntas
  const quizForm = document.getElementById('quiz-form');
  const quizFeedback = document.getElementById('quiz-feedback');
  if (quizForm) {
    quizForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const tema = document.getElementById('tema').value.trim();
      const pergunta = document.getElementById('pergunta').value.trim();
      const alternativas = document.getElementById('alternativas').value.trim(); // separadas por ;
      const correta = document.getElementById('correta').value.trim();
      const nivel = document.getElementById('nivel').value;
      const dica = document.getElementById('dica').value;
      const email = localStorage.getItem("usuario_email");

      const formData = new FormData();
      formData.append("tema", tema);
      formData.append("pergunta", pergunta);
      formData.append("alternativas", alternativas);
      formData.append("correta", correta);
      formData.append("nivel", nivel);
      formData.append("dica", dica);

      try {
        let response;
        if (perguntaEditandoId) {
          formData.append("id", perguntaEditandoId);
          response = await fetch("http://127.0.0.1:5000/editar-pergunta", { method: "POST", body: formData });
        } else {
          formData.append("email_autor", email);
          response = await fetch("http://127.0.0.1:5000/add-pergunta", { method: "POST", body: formData });
        }
        const result = await response.json();
        if (result.ok) {
          quizFeedback.textContent = result.message;
          quizFeedback.className = "feedback success";
          quizForm.reset();
          perguntaEditandoId = null;
          const submitBtn = quizForm.querySelector("button[type='submit']");
          if (submitBtn) submitBtn.textContent = "Cadastrar Pergunta";
          carregarPerguntas();
        } else {
          quizFeedback.textContent = result.message;
          quizFeedback.className = "feedback error";
        }
      } catch {
        quizFeedback.textContent = "Erro de conexão com o servidor.";
        quizFeedback.className = "feedback error";
      }
    });
  }
});

// ============================================================
// Funções do quiz
// ============================================================

// Selecionar nível
function selecionarNivel(nivel) {
  localStorage.setItem('nivelQuiz', nivel);
  const feedback = document.getElementById("nivel-feedback");
  if (feedback) feedback.textContent = "Nível " + nivel + " selecionado!";
  window.location.href = 'quiz.html';
}
window.selecionarNivel = selecionarNivel;

// Carregar perguntas do quiz (padrão + backend)
async function carregarPerguntasQuiz() {
  const perguntasPadrao = {
    facil: [
      { tema: "Doutrina", pergunta: "Segundo o Catecismo, qual é o centro da Boa Nova?", alternativas: ["A criação do mundo", "Milagres dos Apóstolos", "A Ressurreição de Jesus Cristo dos mortos", "Os Dez Mandamentos"], correta: "A Ressurreição de Jesus Cristo dos mortos", dica: "💡 Pense no Mistério Pascal, que é o ponto culminante da vida de Jesus." },
      { tema: "Bíblia", pergunta: "Qual é o primeiro e mais importante mandamento dado por Deus?", alternativas: ["Não roubar", "Honrar pai e mãe", "Amar a Deus sobre todas as coisas", "Guardar domingos e festas"], correta: "Amar a Deus sobre todas as coisas", dica: "💡 Está logo no início dos Dez Mandamentos. Jesus reforçou este como o essencial." },
      { tema: "Eucaristia", pergunta: "O que o sacerdote ergue durante a Consagração, transformando-o no Corpo de Cristo?", alternativas: ["O vinho", "A água", "A hóstia", "O óleo santo"], correta: "A hóstia", dica: "💡 É o pão sem fermento que representa o alimento." },
      { tema: "Santos", pergunta: "Qual santo é conhecido por ser o 'Pai dos Pobres' e fundou a Ordem Franciscana?", alternativas: ["São João Paulo II", "Santo Inácio de Loyola", "São Francisco de Assis", "Santo Agostinho"], correta: "São Francisco de Assis", dica: "💡 Ele abandonou a riqueza e tinha um amor especial pelos animais e pela natureza." },
      { tema: "Mariano", pergunta: "Qual é o nome do anjo que anunciou a Maria que ela seria a Mãe de Jesus?", alternativas: ["Miguel", "Rafael", "Uriel", "Gabriel"], correta: "Gabriel", dica: "💡 Pense na cena da Anunciação, é o mensageiro divino." }
    ],
    medio: [
      { tema: "Eucaristia", pergunta: "Qual termo descreve a mudança do pão e vinho?", alternativas: ["Concomitância", "Consubstanciação", "Transubstanciação", "Impanação"], correta: "Transubstanciação", dica: "💡 Refere-se à substância, não à aparência." },
      { tema: "Catequese", pergunta: "Qual é a oração ensinada por Jesus aos seus discípulos, considerada a síntese de todo o Evangelho?", alternativas: ["Ave Maria", "Creio em Deus Pai", "Salve Rainha", "Pai Nosso"], correta: "Pai Nosso", dica: "💡 É a oração que rezamos na Missa antes da Comunhão." },
      { tema: "Sacramentos", pergunta: "Qual sacramento nos insere na Igreja e nos livra do Pecado Original?", alternativas: ["Confirmação (Crisma)", "Eucaristia", "Batismo", "Reconciliação (Confissão)"], correta: "Batismo", dica: "💡 É a 'porta' de entrada para a vida cristã." },
      { tema: "Maria", pergunta: "Qual dogma mariano afirma que Maria foi concebida sem a mancha do Pecado Original?", alternativas: ["Assunção", "Maternidade Divina", "Virgindade Perpétua", "Imaculada Conceição"], correta: "Imaculada Conceição", dica: "💡 Pense em 'pura' desde o momento em que ela começou a existir." },
      { tema: "Bíblia", pergunta: "Quais são as duas principais partes em que a Bíblia é dividida?", alternativas: ["Pentateuco e Profetas", "Evangelhos e Atos", "Antigo Testamento e Novo Testamento", "Cartas e Apocalipse"], correta: "Antigo Testamento e Novo Testamento", dica: "💡 Uma parte fala da promessa de Deus e a outra do cumprimento dessa promessa em Jesus." }
    ],
    dificil: [
      { tema: "Catecismo", pergunta: "Quais são as quatro partes do Catecismo?", alternativas: ["Liturgia, Oração, Moral, Fé", "Profissão de Fé, Sacramentos, Vida Moral, Oração", "Dogma, Pastoral, Liturgia, Doutrina Social"], correta: "Profissão de Fé, Sacramentos, Vida Moral, Oração", dica: "💡 Estrutura oficial do CIC." },
      { tema: "Doutrina", pergunta: "O que significa a palavra Theotokos, título dado a Maria?", alternativas: ["Virgem Fiel", "Nossa Senhora", "Cheia de Graça", "Mãe de Deus"], correta: "Mãe de Deus", dica: "💡 É um termo grego confirmado no Concílio de Éfeso." },
      { tema: "Igreja", pergunta: "Qual documento do Concílio Vaticano II trata da natureza e da missão da Igreja como Povo de Deus?", alternativas: ["Gaudium et Spes", "Sacrosanctum Concilium", "Dei Verbum", "Lumen Gentium"], correta: "Lumen Gentium", dica: "💡 O nome significa 'Luz dos Povos'." },
      { tema: "Sacramentos", pergunta: "Qual sacramento, junto com Batismo e Eucaristia, forma os 'Sacramentos da Iniciação Cristã'?", alternativas: ["Ordem", "Matrimônio", "Unção dos Enfermos", "Confirmação (Crisma)"], correta: "Confirmação (Crisma)", dica: "💡 Fortalece com o Espírito Santo para testemunhar Cristo." },
      { tema: "Moral", pergunta: "Quais são as virtudes cardeais?", alternativas: ["Fé, Esperança, Caridade", "Prudência, Justiça, Fortaleza, Temperança"], correta: "Prudência, Justiça, Fortaleza, Temperança", dica: "💡 Base das virtudes humanas." }
    ]
  };

  // Segurança para acesso direto sem perfil
  if (!perfilUsuario || perfilUsuario === "null" || perfilUsuario === "") {
    perguntas = perguntasPadrao[nivelSelecionado] || [];
    mostrarPergunta();
    return;
  }

  // Carrega padrão
  perguntas = perguntasPadrao[nivelSelecionado] || [];
  console.log(`Perguntas padrão (${nivelSelecionado}): ${perguntas.length} carregadas.`);

  // Adiciona do backend
  try {
    const response = await fetch(`http://127.0.0.1:5000/get-perguntas?nivel=${nivelSelecionado}`);
    if (!response.ok) throw new Error(`Erro de rede ou servidor: status ${response.status}`);
    const result = await response.json();
    if (result.ok) {
      perguntas = [...perguntas, ...result.perguntas];
      console.log(`Perguntas do backend adicionadas: ${result.perguntas.length}. Total: ${perguntas.length}`);
    } else {
      console.warn("Erro ao buscar perguntas cadastradas. Usando apenas padrão.");
    }
  } catch (error) {
    console.error("Erro ao buscar perguntas do backend. Usando apenas padrão:", error);
  }

  mostrarPergunta();
}

// Finalização do quiz
function finalizarQuiz() {
  const nivel = nivelSelecionado;
  const email = emailUsuario;

  localStorage.setItem("resultado_acertos", acertos);
  localStorage.setItem("resultado_erros", erros);
  localStorage.setItem("resultado_nivel", nivel);

  const formData = new FormData();
  formData.append("email", email);
  formData.append("acertos", acertos);
  formData.append("erros", erros);
  formData.append("nivel", nivel);

  fetch("http://127.0.0.1:5000/update-estatisticas", { method: "POST", body: formData })
    .then(res => res.json())
    .then(result => {
      if (!result.ok) console.error("Erro ao salvar estatísticas:", result.message);
      window.location.href = "resultado.html";
    })
    .catch(error => {
      console.error("Erro de conexão ao enviar estatísticas:", error);
      window.location.href = "resultado.html";
    });
}

// Renderiza a pergunta atual
function mostrarPergunta() {
  if (!elQuizContainer) return;

  if (!perguntas || perguntas.length === 0) {
    elQuizContainer.innerHTML = "<p>Nenhuma pergunta disponível para este nível.</p>";
    atualizarStatus();
    return;
  }

  if (indiceAtual >= perguntas.length) {
    finalizarQuiz();
    return;
  }

  const atual = perguntas[indiceAtual];
  elQuizContainer.innerHTML = `
    <div class="pergunta">
      <h3 class="tema">${atual.tema || "Pergunta"}</h3>
      <p class="texto">${atual.pergunta}</p>
      <ul class="alternativas" role="list">
        ${atual.alternativas.map((alt) => `<li><button class="alt-btn" type="button">${alt}</button></li>`).join("")}
      </ul>
    </div>
  `;

  elFeedback.classList.add("hidden");
  elDica.classList.add("hidden");
  elDica.textContent = "";

  const botoes = elQuizContainer.querySelectorAll(".alt-btn");
  botoes.forEach((btn) => {
    btn.addEventListener("click", () => verificarResposta(btn.textContent));
  });

  atualizarStatus();
}

// Verifica resposta
function verificarResposta(respostaSelecionada) {
  const botoes = elQuizContainer.querySelectorAll(".alt-btn");
  botoes.forEach(btn => btn.disabled = true);

  const atual = perguntas[indiceAtual];
  const correta = atual.correta;
  const acertou = respostaSelecionada === correta;

  botoes.forEach((btn) => {
    if (btn.textContent === respostaSelecionada) {
      btn.classList.add(acertou ? 'selected-correta' : 'selected-incorreta');
    }
    if (btn.textContent === correta) {
      btn.classList.add('resposta-correta');
    }
  });

  if (acertou) {
    acertos++;
    elFeedback.textContent = "✔️ Acertou!";
    elFeedback.className = "feedback correta";
  } else {
    erros++;
    elFeedback.textContent = `❌ Errou. Resposta correta: ${correta}`;
    elFeedback.className = "feedback incorreta";
  }
  elFeedback.classList.remove("hidden");

  atualizarStatus();

  setTimeout(() => {
    indiceAtual++;
    mostrarPergunta();
  }, 1500);
}

// Atualiza status
function atualizarStatus() {
  if (!elContador || !elAcertos || !elErros || !elProgressBar) return;

  const total = perguntas.length || 0;
  elContador.textContent = `${Math.min(indiceAtual + 1, total)} / ${total}`;
  elAcertos.textContent = acertos;
  elErros.textContent = erros;

  const progresso = total > 0 ? Math.floor((indiceAtual / total) * 100) : 0;
  elProgressBar.style.width = `${progresso}%`;
}

// Mostra dica
function mostrarDica() {
  if (!elDica) return;
  if (!perguntas || perguntas.length === 0 || indiceAtual >= perguntas.length) return;

  const dica = perguntas[indiceAtual].dica;
  if (dica) {
    elDica.textContent = dica;
    elDica.classList.remove("hidden");
    if (emailUsuario) {
      fetch("http://127.0.0.1:5000/contar-dica", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailUsuario })
      })
        .then(res => res.json())
        .then(result => {
          if (!result.ok) console.warn("Erro ao contabilizar dica:", result.message);
        })
        .catch(error => console.error("Erro de conexão ao enviar contagem de dica:", error));
    }
  } else {
    elDica.textContent = "Sem dica para esta pergunta.";
    elDica.classList.remove("hidden");
  }
}

// ============================================================
// Painel do Catequista - Perguntas (CRUD)
// ============================================================
async function carregarPerguntas() {
  const email = localStorage.getItem("usuario_email");
  const tabela = document.querySelector("#tabela-perguntas tbody");
  if (!tabela) return;
  tabela.innerHTML = "";

  try {
    const response = await fetch(`http://127.0.0.1:5000/minhas-perguntas?email=${email}`);
    const result = await response.json();

    if (result.ok) {
      console.log("Perguntas recebidas:", result.perguntas);
      result.perguntas.forEach(p => {
        console.log("Renderizando pergunta:", p);
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${p.tema}</td>
          <td>${p.pergunta}</td>
          <td>${p.nivel}</td>
          <td>
            <button onclick="editarPergunta(${p.id})">Editar</button>
            <button onclick="excluirPergunta(${p.id})">Excluir</button>
          </td>
        `;
        tabela.appendChild(row);
      });
    } else {
      console.warn("Erro do backend:", result.message);
    }
  } catch (error) {
    console.error("Erro ao carregar perguntas:", error);
  }
}

async function excluirPergunta(id) {
  const formData = new FormData();
  formData.append("id", id);
  try {
    const response = await fetch("http://127.0.0.1:5000/excluir-pergunta", { method: "POST", body: formData });
    const result = await response.json();
    if (result.ok) {
      carregarPerguntas();
    } else {
      alert(result.message);
    }
  } catch (error) {
    console.error("Erro ao excluir pergunta:", error);
    alert("Erro ao excluir pergunta.");
  }
}

async function editarPergunta(id) {
  try {
    const email = localStorage.getItem("usuario_email");
    const response = await fetch(`http://127.0.0.1:5000/minhas-perguntas?email=${email}`);
    const result = await response.json();

    if (result.ok) {
      const pergunta = result.perguntas.find(p => p.id === id);
      if (!pergunta) {
        alert("Pergunta não encontrada!");
        return;
      }

      document.getElementById("tema").value = pergunta.tema || "";
      document.getElementById("pergunta").value = pergunta.pergunta || "";
      document.getElementById("alternativas").value = (pergunta.alternativas || []).join(";");
      document.getElementById("correta").value = pergunta.correta || "";
      document.getElementById("dica").value = pergunta.dica || "";
      document.getElementById("nivel").value = pergunta.nivel || "facil";

      perguntaEditandoId = id;
      const submitBtn = document.querySelector("#quiz-form button[type='submit']");
      if (submitBtn) submitBtn.textContent = "Salvar edição";
    }
  } catch (error) {
    console.error("Erro ao carregar pergunta para edição:", error);
  }
}
window.editarPergunta = editarPergunta;
window.excluirPergunta = excluirPergunta;

// ============================================================
// Visão geral dos catequizandos (painel do catequista)
// ============================================================
async function carregarCatequizandos() {
  const tabela = document.querySelector(".catequizandos-list tbody");
  if (!tabela) return;
  tabela.innerHTML = "";

  try {
    const response = await fetch("http://127.0.0.1:5000/respostas-usuarios");
    const result = await response.json();
    if (result.ok) {
      result.usuarios.forEach(u => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${u.nome}</td>
          <td>${u.email}</td>
          <td>${u.total_acertos}</td>
          <td>${u.total_erros}</td>
          <td>${u.quizzes_feitos}</td>
          <td>Fácil: ${u.facil} | Médio: ${u.medio} | Difícil: ${u.dificil}</td>
        `;
        tabela.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Erro ao carregar catequizandos:", error);
  }
}

// ============================================================
// Lógica de perfil do usuário (exibir/editar)
// ============================================================
const btnEditar = document.getElementById("editar-perfil");
const modal = document.getElementById("modal-editar");
const formEditar = document.getElementById("form-editar");
const btnFecharModal = document.getElementById("fechar-modal");
const inputNovoNome = document.getElementById("novo-nome");

if (btnEditar && modal && formEditar && btnFecharModal) {
  btnEditar.addEventListener("click", () => { modal.classList.remove("hidden"); });
  btnFecharModal.addEventListener("click", () => { modal.classList.add("hidden"); });

  formEditar.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('email', emailUsuario);
    const novoNome = inputNovoNome.value.trim();
    if (novoNome) formData.append('nome', novoNome);

    try {
      const response = await fetch("http://127.0.0.1:5000/editar-perfil", { method: "POST", body: formData });
      const result = await response.json();
      if (result.ok) {
        alert(result.message);
        modal.classList.add("hidden");
        carregarDadosPerfil();
      } else {
        alert("Erro ao salvar perfil: " + result.message);
      }
    } catch (error) {
      console.error("Erro de conexão ao editar perfil:", error);
      alert("Erro de conexão com o servidor ao salvar perfil.");
    }
  });
}
window.carregarDadosPerfil = carregarDadosPerfil;

// Perfil - carregar e exibir estatísticas
if (document.querySelector("#nome-usuario")) {
  const nomeUsuario = document.getElementById("nome-usuario");
  const dicasUsadas = document.getElementById("dicas-usadas");
  const totalAcertos = document.getElementById("total-acertos");
  const totalErros = document.getElementById("total-erros");
  const quizzesFeitos = document.getElementById("quizzes-feitos");
  const facil = document.getElementById("facil");
  const medio = document.getElementById("medio");
  const dificil = document.getElementById("dificil");
  const estrelaContainer = document.getElementById("estrela-container");
  const mensagemPremio = document.getElementById("mensagem-premio");
  const mensagemEstrela = document.getElementById("mensagem-estrela");

  const btnEditar = document.getElementById("editar-perfil");
  const modal = document.getElementById("modal-editar");
  const formEditar = document.getElementById("form-editar");
  const btnFecharModal = document.getElementById("fechar-modal");
  const inputNovoNome = document.getElementById("novo-nome");

  if (!emailUsuario) {
    nomeUsuario.textContent = "Usuário não identificado";
  } else {
    fetch(`http://127.0.0.1:5000/get-perfil?email=${encodeURIComponent(emailUsuario)}`)
      .then(response => response.json())
      .then(result => {
        if (result.ok) {
          const user = result.user || {};
          const stats = result.estatisticas || {};

          nomeUsuario.textContent = user.nome || "Usuário";
          if (inputNovoNome) inputNovoNome.value = user.nome || "";

          dicasUsadas.textContent = stats.dicas_usadas ?? 0;
          totalAcertos.textContent = stats.total_acertos ?? 0;
          totalErros.textContent = stats.total_erros ?? 0;
          quizzesFeitos.textContent = stats.quizzes_feitos ?? 0;

          facil.textContent = stats.facil ?? 0;
          medio.textContent = stats.medio ?? 0;
          dificil.textContent = stats.dificil ?? 0;

          estrelaContainer.innerHTML = "";
          const estrelas = Math.floor((stats.total_acertos ?? 0) / 3);
          for (let i = 0; i < estrelas; i++) {
            const estrela = document.createElement("span");
            estrela.textContent = "⭐";
            estrelaContainer.appendChild(estrela);
          }
          if (mensagemEstrela) {
            if (estrelas > 0) {
              mensagemEstrela.classList.remove("hidden");
              mensagemEstrela.textContent = `Você conquistou ${estrelas} estrela(s) ⭐. Você ganha uma estrela a cada 3 acertos totais!`;
            } else {
              mensagemEstrela.classList.add("hidden");
              mensagemEstrela.textContent = "";
            }
          }

          const temMedalha = (stats.total_erros ?? 0) <= 3 && (stats.quizzes_feitos ?? 0) > 0;
          if (temMedalha) {
            mensagemPremio.classList.remove("hidden");
            mensagemPremio.textContent = "🎉 Parabéns! Você conquistou uma medalha 🥇 por concluir quizzes com até 3 erros!";
          } else {
            mensagemPremio.classList.add("hidden");
            mensagemPremio.textContent = "";
          }
        } else {
          nomeUsuario.textContent = result.message || "Erro ao carregar perfil.";
        }
      })
      .catch(error => {
        nomeUsuario.textContent = "Erro ao carregar perfil.";
        console.error(error);
      });
  }

  btnEditar?.addEventListener("click", () => { if (modal) modal.classList.remove("hidden"); });
  btnFecharModal?.addEventListener("click", () => { if (modal) modal.classList.add("hidden"); });

  formEditar?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const novoNome = inputNovoNome.value.trim();
    const formData = new FormData();
    formData.append("email", emailUsuario);
    if (novoNome) formData.append("nome", novoNome);

    try {
      const response = await fetch("http://127.0.0.1:5000/editar-perfil", { method: "POST", body: formData });
      const result = await response.json();
      if (result.ok) {
        alert(result.message);
        if (modal) modal.classList.add("hidden");
        window.location.reload();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert("Erro de conexão ao tentar editar o perfil.");
      console.error(error);
    }
  });
}

// Perfil - configuração de botões em perfil.html
document.addEventListener("DOMContentLoaded", () => {
  if (window.location.pathname.includes("perfil.html")) {
    carregarDadosPerfil();

    const btnNovoQuiz = document.getElementById("btn-novo-quiz");
    if (btnNovoQuiz) {
      btnNovoQuiz.addEventListener("click", () => {
        window.location.href = "pessoal.html";
      });
    }

    const modal = document.getElementById("modal-editar");
    const btnEditar = document.getElementById("editar-perfil");
    const btnFechar = document.getElementById("fechar-modal");

    if (btnEditar) btnEditar.addEventListener("click", () => modal.classList.remove("hidden"));
    if (btnFechar) btnFechar.addEventListener("click", () => modal.classList.add("hidden"));

    const formEditar = document.getElementById("form-editar");
    if (formEditar) {
      formEditar.addEventListener("submit", async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("email", localStorage.getItem("usuario_email"));
        formData.append("nome", document.getElementById("novo-nome").value);
        const foto = document.getElementById("nova-foto").files[0];
        if (foto) formData.append("foto", foto);

        const response = await fetch("http://127.0.0.1:5000/editar-perfil", { method: "POST", body: formData });
        const result = await response.json();
        if (result.ok) {
          alert("Perfil atualizado!");
          window.location.reload();
        } else {
          alert(result.message);
        }
      });
    }
  }
});

// Botão “Novo Quiz” fora de perfil.html (caso exista em outra página)
const btnNovoQuiz = document.getElementById("btn-novo-quiz");
if (btnNovoQuiz) {
  btnNovoQuiz.addEventListener("click", () => {
    window.location.href = 'pessoal.html';
  });
}

// ============================================================
// Carregar dados do perfil (função usada em múltiplos pontos)
// ============================================================
async function carregarDadosPerfil() {
  const email = localStorage.getItem("usuario_email");
  if (!email) {
    window.location.href = "login.html";
    return;
  }
  try {
    const response = await fetch(`http://127.0.0.1:5000/get-perfil?email=${email}`);
    const result = await response.json();
    if (result.ok) {
      const user = result.user;
      const stats = result.estatisticas;
      document.getElementById("nome-usuario").textContent = user.nome;
      document.getElementById("foto-perfil").src = user.foto_url || "static/fotos/default.png";
      document.getElementById("dicas-usadas").textContent = stats.dicas_usadas;
      document.getElementById("total-acertos").textContent = stats.total_acertos;
      document.getElementById("total-erros").textContent = stats.total_erros;
      document.getElementById("quizzes-feitos").textContent = stats.quizzes_feitos;
      document.getElementById("facil").textContent = stats.facil;
      document.getElementById("medio").textContent = stats.medio;
      document.getElementById("dificil").textContent = stats.dificil;
      const estrelas = Math.floor(stats.total_acertos / 3);
      const estrelaContainer = document.getElementById("estrela-container");
      estrelaContainer.innerHTML = "⭐".repeat(estrelas);
      const premio = document.getElementById("mensagem-premio");
      if (stats.quizzes_feitos > 0 && stats.total_erros <= 3) {
        premio.textContent = "🥇 Parabéns! Você ganhou a medalha!";
        premio.classList.remove("hidden");
      } else {
        premio.classList.add("hidden");
      }
    }
  } catch (error) {
    console.error("Erro ao carregar perfil:", error);
  }
}
