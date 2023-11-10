import { Client, IntentsBitField } from "discord.js";
import * as dotenv from "dotenv";
dotenv.config()

const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.GuildMessageReactions,
        IntentsBitField.Flags.MessageContent
    ]
})

client.on('ready', (e) => {
    console.log(`${e.user.tag} está online!`)
})

client.on("messageCreate", (message) => {
    if(message.author.bot) return

    if(message.content === "hello"){
        message.reply("O " + message.author.username + " é corno");
    }
})

const eventos = new Map();

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    // Comando para iniciar um evento
    if (message.content.toLowerCase() === "/scrim") {
        if (eventos.has(message.guild.id)) {
            message.reply("Já há uma scrim em andamento.");
            return;
        }

        const novoEvento = {
            iniciadoPor: message.author.username,
            participantes: [],
            mensagem: null
        };

        eventos.set(message.guild.id, novoEvento);

        // Envia a mensagem do evento e adiciona uma reação 🎉 automaticamente
        const mensagemEvento = await message.channel.send(`${message.author.username} iniciou uma nova Scrim! Reaja com 🎉 para participar. \n
        O evento deve conter no mínimo 10 reações para que a tabela seja gerada! (sem contar com a reação do bot)`);
        novoEvento.mensagem = mensagemEvento;

        // Adiciona uma reação à mensagem para permitir que as pessoas votem
        await mensagemEvento.react('🎉');
    }
});

client.on('messageReactionAdd', (reaction, user) => {
    const eventoAtual = eventos.get(reaction.message.guild.id);
    if (eventoAtual && eventoAtual.mensagem && reaction.message.id === eventoAtual.mensagem.id) {
        // Verifica se a reação é da emoji correta e se o usuário não é um bot
        if (reaction.emoji.name === '🎉' && !user.bot) {
            // Verifica se o usuário já está participando
            if (eventoAtual.participantes.includes(user.id)) {
                reaction.message.channel.send(`${user.username}, você já está participando do evento.`);
                return;
            }

            // Adiciona o usuário à lista de participantes
            eventoAtual.participantes.push(user.id);
            reaction.message.channel.send(`${user.username} votou para participar do evento!`);
        }
    }
});

client.on('messageReactionRemove', (reaction, user) => {
    const eventoAtual = eventos.get(reaction.message.guild.id);
    if (eventoAtual && eventoAtual.mensagem && reaction.message.id === eventoAtual.mensagem.id) {
        // Verifica se a reação removida é da emoji correta e se o usuário não é um bot
        if (reaction.emoji.name === '🎉' && !user.bot) {
            // Remove o usuário da lista de participantes
            const index = eventoAtual.participantes.indexOf(user.id);
            if (index !== -1) {
                eventoAtual.participantes.splice(index, 1);
                reaction.message.channel.send(`${user.username} retirou seu voto para participar do evento.`);
            }
        }
    }
});

client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    const eventoAtual = eventos.get(message.guild.id);

    // Comando para exibir a tabela de chaveamento
    if (message.content.toLowerCase() === "/tabela") {
        if (!eventoAtual || eventoAtual.participantes.length < 10) {
            message.reply("Não há participantes suficientes para criar uma tabela de chaveamento.");
            return;
        }

        // Chama a função de criação de chaveamento
        const tabelaDeChaveamento = criarChaveamento(eventoAtual.participantes);

        // Exibe as equipes no chat
        for (let i = 0; i < tabelaDeChaveamento.length; i++) {
            message.channel.send(`**Equipe ${i + 1}:** ${tabelaDeChaveamento[i].join(', ')}`);
        }
    }
});

async function criarChaveamento(guild, participantes) {
    // Embaralhar a lista de participantes para distribuir aleatoriamente
    const participantesEmbaralhados = participantes.sort(() => Math.random() - 0.5);

    // Calcular o número de equipes necessárias
    const numEquipes = Math.ceil(participantesEmbaralhados.length / 5);

    // Inicializar as equipes
    const equipes = new Array(numEquipes).fill([]);

    // Buscar os membros correspondentes aos IDs dos participantes
    const membros = await guild.members.fetch({ user: participantesEmbaralhados, force: true });

    // Distribuir os membros nas equipes
    membros.forEach((membro, index) => {
        const equipeIndex = index % numEquipes;
        equipes[equipeIndex].push(membro);
    });

    // Retornar as equipes
    return equipes;
}

async function apagarMensagensDoBot(channel) {
    try {
        // Busca as últimas 100 mensagens no canal
        const messages = await channel.messages.fetch({ limit: 100 });

        // Filtra apenas as mensagens enviadas pelo bot
        const mensagensDoBot = messages.filter((msg) => msg.author.bot);

        // Deleta as mensagens do bot
        await channel.bulkDelete(mensagensDoBot, true);
    } catch (error) {
        console.error("Erro ao apagar mensagens do bot:", error);
    }
}

// Exemplo de uso:
client.on("messageCreate", async (message) => {
    // Verifica se o comando é para apagar mensagens do bot
    if (message.content.toLowerCase() === "/limpar") {
        // Chama a função para apagar as mensagens do bot no canal atual
        await apagarMensagensDoBot(message.channel);
    }
});

async function apagarMensagensDoUsuario(channel, usuario) {
    try {
        // Busca as últimas 100 mensagens no canal
        const messages = await channel.messages.fetch({ limit: 100 });

        // Filtra apenas as mensagens enviadas pelo usuário
        const mensagensDoUsuario = messages.filter((msg) => msg.author.id === usuario.id);

        // Deleta as mensagens do usuário
        await channel.bulkDelete(mensagensDoUsuario, true);
    } catch (error) {
        console.error("Erro ao apagar mensagens do usuário:", error);
    }
}

// Exemplo de uso:
client.on("messageCreate", async (message) => {
    // Verifica se o comando é para apagar as mensagens do usuário mencionado
    if (message.content.toLowerCase().startsWith("/limparminhasmensagens")) {
        // Obtém a menção do usuário mencionado
        const mencionado = message.mentions.users.first();

        if (mencionado) {
            // Chama a função para apagar as mensagens do usuário mencionado no canal atual
            await apagarMensagensDoUsuario(message.channel, mencionado);
        } else {
            message.reply("Você precisa mencionar um usuário para apagar as mensagens.");
        }
    }
});

const prefixo = "/comandos-scrim"; // Prefixo para identificar comandos

function listarComandosDisponiveis(channel) {
    // Lista de comandos disponíveis
    const listaComandos = "Aqui estão os comandos disponíveis:\n" +
        "/scrim - Inicia um novo evento\n" +
        "/tabela - Exibe a tabela de chaveamento\n" +
        "/limparminhasmensagens @usuário - Apaga todas as mensagens de um usuário mencionado";

    // Envia a lista de comandos diretamente para o canal
    channel.send(listaComandos);
}

client.on("messageCreate", (message) => {
    if (message.author.bot) return; // Ignora mensagens de outros bots
    if (message.content === prefixo) {
        // Chama a função para listar os comandos disponíveis no canal atual
        listarComandosDisponiveis(message.channel);
    }
});


client.login(process.env.TOKEN)