const { EmbedBuilder } = require('@discordjs/builders');
const { query } = require('../../database');

module.exports = {
    name: 'disneycharacters',
    description: 'Available Disney characters to guess.',
    aliases: ['dc', 'characters'],
    async execute(message, args) {
        try {
            // Query to get all characters and their corresponding series or films
            const result = await query('SELECT series_film, name FROM disney_characters ORDER BY series_film ASC, name ASC');

            // Create an object to group characters by their series/film
            const seriesFilms = {};
            result.rows.forEach(row => {
                if (!seriesFilms[row.series_film]) {
                    seriesFilms[row.series_film] = [];
                }
                seriesFilms[row.series_film].push(row.name);
            });

            // Convert the object to an array of embeds (pages)
            const embeds = [];
            const pageSize = 5; // Number of series/films per page
            const seriesArray = Object.entries(seriesFilms);

            for (let i = 0; i < seriesArray.length; i += pageSize) {
                const currentSeries = seriesArray.slice(i, i + pageSize);

                const embed = new EmbedBuilder()
                    .setTitle('Disney Characters')
                    .setDescription('Here are the Disney characters grouped by their series/film:')
                    .setColor(0x0099FF)
                    .setFooter({ text: `Page ${Math.floor(i / pageSize) + 1} of ${Math.ceil(seriesArray.length / pageSize)}` });

                currentSeries.forEach(([series, characters]) => {
                    embed.addFields({
                        name: '🔹' + series,
                        value: characters.map(name => `\`${name}\``).join(', '),
                    });
                });

                embeds.push(embed);
            }

            let currentPage = 0;
            const embedMessage = await message.reply({ embeds: [embeds[currentPage]] });

            // If there is more than one page, add navigation reactions
            if (embeds.length > 1) {
                await embedMessage.react('⬅️');
                await embedMessage.react('➡️');

                const filter = (reaction, user) => {
                    return ['⬅️', '➡️'].includes(reaction.emoji.name) && !user.bot;
                };

                const collector = embedMessage.createReactionCollector({ filter, time: 60000 });

                collector.on('collect', (reaction, user) => {
                    if (reaction.emoji.name === '➡️') {
                        if (currentPage < embeds.length - 1) {
                            currentPage++;
                            embedMessage.edit({ embeds: [embeds[currentPage]] });
                        }
                    } else if (reaction.emoji.name === '⬅️') {
                        if (currentPage > 0) {
                            currentPage--;
                            embedMessage.edit({ embeds: [embeds[currentPage]] });
                        }
                    }
                    reaction.users.remove(user.id); // Remove the user's reaction to allow multiple clicks
                });

                collector.on('end', () => {
                    embedMessage.reactions.removeAll(); // Clean up reactions after time limit
                });
            }

        } catch (error) {
            console.error(`Error executing command "disneycharacters": ${error.message}` + '\n' + error.stack);
            message.reply('An error occurred while executing the command.');
        }
    }
};
