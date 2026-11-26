
const API_BASE_URL = "https://localhost:7238/api";

const API_REGISTRO_PONTO = `${API_BASE_URL}/RegistroPonto`;
const API_BANCO_HORAS = `${API_BASE_URL}/BancoHora`;

const sessao = JSON.parse(
    localStorage.getItem("rh_sessao") || "null"
);

const boasVindas = document.getElementById("boasVindas");
const mensagemPonto = document.getElementById("mensagemPonto");
const saldoBancoHoras = document.getElementById("saldoBancoHoras");
const mensagemBancoHoras = document.getElementById("mensagemBancoHoras");
const historicoPonto = document.getElementById("historicoPonto");
const mensagemHistorico = document.getElementById("mensagemHistorico");

const botaoEntrada = document.getElementById("entrada");
const botaoInicioIntervalo = document.getElementById("inicioIntervalo");
const botaoFimIntervalo = document.getElementById("fimIntervalo");
const botaoSaida = document.getElementById("saida");
const botaoAtualizar = document.getElementById("atualizarDados");
const botaoSair = document.getElementById("sair");

let graficoHoras = null;
let enviandoPonto = false;
let temporizadorBancoHoras = null;
let temporizadorHistorico = null;

const funcionarioId = sessao
    ? Number(sessao.id ?? sessao.funcionarioId)
    : 0;

if (
    !sessao ||
    sessao.perfil !== "funcionario" ||
    !funcionarioId
) {
    window.location.replace("login.html?perfil=funcionario");
} else {
    if (boasVindas) {
        boasVindas.textContent = `Bem-vindo, ${sessao.nome}!`;
    }

    iniciarPainel();
}

function formatarDuracao(valor) {
    const horasDecimais = Number(valor) || 0;
    const minutosTotais = Math.round(horasDecimais * 60);

    const sinal = minutosTotais < 0 ? "-" : "";
    const absoluto = Math.abs(minutosTotais);

    const horas = Math.floor(absoluto / 60);
    const minutos = absoluto % 60;

    return `${sinal}${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function formatarSaldo(valor) {
    const horasDecimais = Number(valor) || 0;
    const minutosTotais = Math.round(horasDecimais * 60);
    const duracao = formatarDuracao(horasDecimais);

    if (minutosTotais > 0) {
        return `+${duracao}`;
    }

    return duracao;
}

function mostrarSucesso(elemento, mensagem, temporizador) {
    if (!elemento) {
        return;
    }

    if (temporizador) {
        clearTimeout(temporizador);
    }

    elemento.textContent = mensagem;

    return setTimeout(() => {
        elemento.textContent = "";
    }, 3000);
}

function interpretarDataHora(valor) {
    if (!valor) {
        return new Date(NaN);
    }

    const possuiFuso = /(?:Z|[+-]\d{2}:\d{2})$/i.test(valor);
    const dataNormalizada = possuiFuso ? valor : `${valor}Z`;

    return new Date(dataNormalizada);
}

function interpretarDataReferencia(valor) {
    if (!valor) {
        return new Date(NaN);
    }

    const texto = String(valor);
    const correspondencia = texto.match(
        /^(\d{4})-(\d{2})-(\d{2})/
    );

    if (!correspondencia) {
        return new Date(NaN);
    }

    const ano = Number(correspondencia[1]);
    const mes = Number(correspondencia[2]) - 1;
    const dia = Number(correspondencia[3]);

    const data = new Date(ano, mes, dia);

    if (
        data.getFullYear() !== ano ||
        data.getMonth() !== mes ||
        data.getDate() !== dia
    ) {
        return new Date(NaN);
    }

    return data;
}

async function requisicaoAPI(url, opcoes = {}) {
    const resposta = await fetch(url, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            ...opcoes.headers
        }
    });

    if (!resposta.ok) {
        let mensagem = `Erro HTTP ${resposta.status}.`;

        try {
            const erro = await resposta.json();

            mensagem =
                erro.detail ||
                erro.title ||
                erro.mensagem ||
                erro.message ||
                mensagem;
        } catch {
           
        }

        throw new Error(mensagem);
    }

    if (resposta.status === 204) {
        return null;
    }

    const texto = await resposta.text();

    return texto ? JSON.parse(texto) : null;
}

async function iniciarPainel() {
    await atualizarDados();
}

async function atualizarDados() {
    if (botaoAtualizar) {
        botaoAtualizar.disabled = true;
        botaoAtualizar.textContent = "Atualizando...";
    }

    if (mensagemBancoHoras) {
        mensagemBancoHoras.textContent =
            "Atualizando banco de horas...";
    }

    if (mensagemHistorico) {
        mensagemHistorico.textContent =
            "Carregando histórico de ponto...";
    }

    try {
        const [bancoHoras, registrosPonto] = await Promise.all([
            requisicaoAPI(
                `${API_BANCO_HORAS}/${funcionarioId}`
            ),
            requisicaoAPI(
                `${API_REGISTRO_PONTO}/${funcionarioId}`
            )
        ]);

        exibirBancoHoras(bancoHoras);
        exibirHistorico(registrosPonto);
        desenharGrafico(bancoHoras);

        temporizadorBancoHoras = mostrarSucesso(
            mensagemBancoHoras,
            "Banco de horas atualizado com sucesso.",
            temporizadorBancoHoras
        );

        temporizadorHistorico = mostrarSucesso(
            mensagemHistorico,
            "Histórico atualizado com sucesso.",
            temporizadorHistorico
        );
    } catch (erro) {
        console.error("Erro ao atualizar os dados:", erro);

        if (temporizadorBancoHoras) {
            clearTimeout(temporizadorBancoHoras);
            temporizadorBancoHoras = null;
        }

        if (temporizadorHistorico) {
            clearTimeout(temporizadorHistorico);
            temporizadorHistorico = null;
        }

        if (mensagemBancoHoras) {
            mensagemBancoHoras.textContent =
                `Erro ao carregar banco de horas: ${erro.message}`;
        }

        if (mensagemHistorico) {
            mensagemHistorico.textContent =
                `Erro ao carregar histórico: ${erro.message}`;
        }
    } finally {
        if (botaoAtualizar) {
            botaoAtualizar.disabled = false;
            botaoAtualizar.textContent = "Atualizar meus dados";
        }
    }
}

function exibirBancoHoras(registros) {
    const lista = Array.isArray(registros) ? registros : [];

    const saldoTotal = lista.reduce((total, registro) => {
        return total + Number(registro.saldoHoras || 0);
    }, 0);

    if (saldoBancoHoras) {
        saldoBancoHoras.textContent = formatarSaldo(saldoTotal);
    }
}

function exibirHistorico(registros) {
    if (!historicoPonto) {
        console.error(
            'Elemento HTML "historicoPonto" não encontrado.'
        );
        return;
    }

    historicoPonto.replaceChildren();

    if (!Array.isArray(registros) || registros.length === 0) {
        const linha = document.createElement("tr");
        const celula = document.createElement("td");

        celula.colSpan = 3;
        celula.textContent = "Nenhum registro de ponto encontrado.";

        linha.appendChild(celula);
        historicoPonto.appendChild(linha);
        return;
    }

    const ordenados = [...registros].sort(
        (a, b) =>
            interpretarDataHora(b.dataHora) -
            interpretarDataHora(a.dataHora)
    );

    for (const registro of ordenados) {
        const linha = document.createElement("tr");
        const data = interpretarDataHora(registro.dataHora);

        if (Number.isNaN(data.getTime())) {
            adicionarCelula(linha, "Data inválida");
            adicionarCelula(linha, "--:--");
        } else {
            adicionarCelula(
                linha,
                data.toLocaleDateString("pt-BR", {
                    timeZone: "America/Bahia"
                })
            );

            adicionarCelula(
                linha,
                data.toLocaleTimeString("pt-BR", {
                    timeZone: "America/Bahia",
                    hour: "2-digit",
                    minute: "2-digit"
                })
            );
        }

        adicionarCelula(linha, traduzirTipo(registro.tipo));
        historicoPonto.appendChild(linha);
    }
}

function adicionarCelula(linha, texto) {
    const celula = document.createElement("td");
    celula.textContent = texto ?? "";
    linha.appendChild(celula);
}

function traduzirTipo(tipo) {
    const tipos = {
        Entrada: "Entrada",
        InicioIntervalo: "Início do intervalo",
        FimIntervalo: "Fim do intervalo",
        Saida: "Saída"
    };

    return tipos[tipo] || tipo || "Não informado";
}

function desenharGrafico(registros) {
    const canvas = document.getElementById("graficoHorasTrabalhadas");

    if (!canvas || typeof Chart === "undefined") {
        console.warn(
            "Gráfico indisponível: verifique o canvas e a biblioteca Chart.js."
        );
        return;
    }

    const lista = Array.isArray(registros) ? [...registros] : [];

    lista.sort((a, b) => {
        const dataA = interpretarDataReferencia(a.dataReferencia);
        const dataB = interpretarDataReferencia(b.dataReferencia);

        return dataA.getTime() - dataB.getTime();
    });

    const datas = lista.map(registro => {
        const data = interpretarDataReferencia(registro.dataReferencia);

        return Number.isNaN(data.getTime())
            ? "Data inválida"
            : data.toLocaleDateString("pt-BR");
    });

    const minutosTrabalhados = lista.map(registro =>
        Math.round(Number(registro.horasTrabalhadas || 0) * 60)
    );

    if (graficoHoras) {
        graficoHoras.destroy();
    }

    graficoHoras = new Chart(canvas, {
        type: "bar",

        data: {
            labels: datas,

            datasets: [{
                label: "Horas trabalhadas",
                data: minutosTrabalhados,
                backgroundColor: "rgba(139, 92, 246, 0.7)",
                borderColor: "rgb(139, 92, 246)",
                borderWidth: 1,
                borderRadius: 6
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,

            scales: {
                y: {
                    beginAtZero: true,

                    title: {
                        display: true,
                        text: "Tempo trabalhado (HH:MM)"
                    },

                    ticks: {
                        callback: function(valor) {
                            return formatarDuracao(Number(valor) / 60);
                        }
                    }
                }
            },

            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Horas trabalhadas: ${formatarDuracao(Number(context.raw) / 60)}`;
                        }
                    }
                }
            }
        }
    });
}

async function registrarPonto(tipo) {
    if (enviandoPonto) {
        return;
    }

    const nomes = {
        Entrada: "entrada",
        InicioIntervalo: "início do intervalo",
        FimIntervalo: "fim do intervalo",
        Saida: "saída"
    };

    const confirmado = confirm(
        `Deseja confirmar o registro de ${nomes[tipo]} agora?`
    );

    if (!confirmado) {
        return;
    }

    enviandoPonto = true;
    bloquearBotoes(true);

    if (mensagemPonto) {
        mensagemPonto.textContent = "Registrando ponto...";
    }

    try {
        const agora = new Date();

        await requisicaoAPI(API_REGISTRO_PONTO, {
            method: "POST",
            body: JSON.stringify({
                funcionarioId: funcionarioId,
                tipo: tipo,
                dataHora: agora.toISOString()
            })
        });

        if (mensagemPonto) {
            mensagemPonto.textContent =
                `Registro de ${nomes[tipo]} realizado com sucesso.`;
        }

        if (tipo === "Saida") {
            await calcularBancoHoras(agora);
        }

        await atualizarDados();
    } catch (erro) {
        console.error("Erro ao registrar ponto:", erro);

        if (mensagemPonto) {
            mensagemPonto.textContent =
                `Não foi possível registrar o ponto: ${erro.message}`;
        }
    } finally {
        enviandoPonto = false;
        bloquearBotoes(false);
    }
}

async function calcularBancoHoras(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    const dataReferencia = `${ano}-${mes}-${dia}T00:00:00`;

    try {
        const resultado = await requisicaoAPI(
            `${API_BANCO_HORAS}/calcular`,
            {
                method: "POST",
                body: JSON.stringify({
                    funcionarioId: funcionarioId,
                    dataReferencia: dataReferencia
                })
            }
        );

        if (mensagemPonto) {
            mensagemPonto.textContent =
                resultado?.mensagem ||
                "Ponto registrado. Cálculo do banco de horas concluído.";
        }
    } catch (erro) {
        console.error("Erro ao calcular banco de horas:", erro);

        if (mensagemPonto) {
            mensagemPonto.textContent =
                "Saída registrada, mas o cálculo automático não foi concluído. Confira os quatro registros do dia.";
        }
    }
}

function bloquearBotoes(bloqueado) {
    [
        botaoEntrada,
        botaoInicioIntervalo,
        botaoFimIntervalo,
        botaoSaida,
        botaoAtualizar
    ].forEach(botao => {
        if (botao) {
            botao.disabled = bloqueado;
        }
    });
}

if (botaoEntrada) {
    botaoEntrada.addEventListener("click", () => {
        registrarPonto("Entrada");
    });
}

if (botaoInicioIntervalo) {
    botaoInicioIntervalo.addEventListener("click", () => {
        registrarPonto("InicioIntervalo");
    });
}

if (botaoFimIntervalo) {
    botaoFimIntervalo.addEventListener("click", () => {
        registrarPonto("FimIntervalo");
    });
}

if (botaoSaida) {
    botaoSaida.addEventListener("click", () => {
        registrarPonto("Saida");
    });
}

if (botaoAtualizar) {
    botaoAtualizar.addEventListener("click", atualizarDados);
} else {
    console.error(
        'Botão com ID "atualizarDados" não encontrado no HTML.'
    );
}

if (botaoSair) {
    botaoSair.addEventListener("click", () => {
        localStorage.removeItem("rh_sessao");
        window.location.href = "../index.html";
    });
}
