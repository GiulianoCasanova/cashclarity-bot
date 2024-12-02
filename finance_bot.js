const TelegramBot = require('node-telegram-bot-api');
const yahooFinance = require('yahoo-finance2').default;
const ChartJsImage = require('chartjs-to-image');
const mysql = require('mysql2');
const xlsx = require('xlsx');
const fs = require('fs');
// Configuración del bot de Telegram
const token = '6789802815:AAHhRFdjH0Mz6blnt8WUbV0xCRHS6SgtPWg';
const bot = new TelegramBot(token, { polling: true });

const axios = require('axios');

// Tu clave de API de ExchangeRate-API (regístrate para obtener una gratuita)
const EXCHANGE_RATE_API_KEY = '40a8b5e3eebc1c11c12c895b'; // Reemplaza con tu clave
const EXCHANGE_RATE_API_URL = `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}`;







// Configuración de la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'finance_bot'
});

connection.connect((err) => {
  if (err) {
    console.error('Error conectando a la base de datos:', err.stack);
    return;
  }
  console.log('Conectado a la base de datos');
});


//Exporta los gastos de un chat específico a un archivo Excel (.xlsx) y ejecuta un callback con la ruta del archivo generado.
function exportarGastos(chatId, callback) {
  const query = 'SELECT * FROM gastos WHERE idchat = ?';
  connection.query(query, [chatId], (err, results) => {
    if (err) {
      console.error('Error recuperando los gastos:', err);
      return;
    }

    // Crear un libro de trabajo
    const wb = xlsx.utils.book_new();
    // Convertir los datos de los gastos a una hoja de trabajo
    const ws = xlsx.utils.json_to_sheet(results);
    // Agregar la hoja al libro
    xlsx.utils.book_append_sheet(wb, ws, 'Gastos');

    // Guardar el archivo temporalmente
    const filePath = `./gastos_${chatId}.xlsx`;
    xlsx.writeFile(wb, filePath);

    callback(filePath);
  });
}

// Comando para exportar los gastos
bot.onText(/\/exportargastos/, (msg) => {
  const chatId = msg.chat.id;
  exportarGastos(chatId, (filePath) => {
    // Enviar el archivo al usuario
    bot.sendDocument(chatId, filePath).then(() => {
      // Eliminar el archivo temporal después de enviarlo
      fs.unlinkSync(filePath);
    });
  });
});

bot.onText(/^\/setcommand/, (msg) => {
  const opts = [
    { command: 'help', description: 'ayuda' },
    { command: 'start', description: 'Main menu' },
    { command: 'anadirgasto', description: 'Añadir un gasto' },
    { command: 'quitargasto', description: 'Quitar un gasto' },
    { command: 'listargastos', description: 'Listar gastos' },
    { command: 'exportargastos', description: 'Exportar gastos a .XLSX' },
    { command: 'cerrargasto', description: 'Cerrar un grupo de gastos' },
    { command: 'modificargasto', description: 'Agregar gasto a un grupo ya creado' },
    { command: 'creargrupogasto', description: 'Crear un nuevo grupo de gastos' },
    { command: 'agregargasto', description: 'Agregar un gasto a un grupo existente' },
    { command: 'versaldo', description: 'Ver saldo del usuario' },
    { command: 'cerrargrupogasto', description: 'Cerrar y calcular un grupo de gastos' },
  ];

  bot.setMyCommands(opts).then(function (info) {
    console.log(info);
  });
});

const helpMessage = `
¡Hola! Soy tu asistente de finanzas. Aquí te ayudaré a gestionar tus gastos de manera sencilla. A continuación, te muestro cómo puedes utilizarme:

**Comandos Personales:**
1. **/start** - Muestra el menú principal con opciones para añadir, quitar y listar gastos.
2. **/anadirgasto** - Añade un nuevo gasto a un grupo especificado.
3. **/listargastos** - Lista todos los grupos de gastos y sus detalles.
4. **/exportargastos** - Exporta los gastos a un archivo .XLSX.
5. **/listarcategorias** - Lista todas las categorías disponibles.
6. **/agregarcategoria <NombreCategoria>** - Añade una nueva categoría.
7. **/graficogastos** - Genera un gráfico circular de tus gastos por categoría.
8. **/cerrargasto** - Cierra un grupo de gastos y calcula las divisiones necesarias.

**Comandos Grupales:**
1. **/creargrupogasto <NombreGrupo>** - Crea un nuevo grupo de gastos.
2. **/quitargasto** - Elimina un gasto o un grupo de gastos.
3. **/cerrargrupogasto <IDGrupo>** - Cierra y calcula un grupo de gastos.
4. **/modificargasto** - Modifica un gasto en un grupo ya creado.
5. **/agregargasto <IDGrupo> <Monto>** - Agrega un gasto a un grupo existente.
6.**/versaldo** - Muestra tu saldo actual.

Si tienes alguna pregunta o necesitas más ayuda, no dudes en preguntar. ¡Estoy aquí para ayudarte a gestionar tus finanzas de manera eficiente!
  `;

bot.onText(/\/help/, (msg) => {
  const chatId = msg.chat.id;


  bot.sendMessage(chatId, helpMessage);
});

// Comando /start
// Comando /start
const mainMenu = {
  reply_markup: JSON.stringify({
    inline_keyboard: [
      [{ text: "📝 Añadir Gasto", callback_data: "add_expense" }],
      [{ text: "🗑️ Quitar Gasto", callback_data: "remove_expense" }],
      [{ text: "📊 Listar Gastos", callback_data: "list_expenses" }],
      [{ text: "📤 Exportar Gastos", callback_data: "export_expenses" }],
      [{ text: "💰 Ver Saldo", callback_data: "view_balance" }],
      [{ text: "👥 Gestionar Grupos", callback_data: "manage_groups" }],
      [{ text: "❓ Ayuda", callback_data: "help" }]
    ]
  })
};

const welcomeMessage = `
¡Bienvenido al Bot de Finanzas Personales! 🎉

Este bot está diseñado para ayudarte a gestionar tus finanzas personales y grupales de manera eficiente. Puedes realizar un seguimiento de tus gastos, organizarlos en grupos, y exportar la información cuando lo necesites.

**Ejemplo de uso:**

1. **Añadir un gasto**:
   - Haz clic en "📝 Añadir Gasto" en el menú.
   - El bot te pedirá que ingreses el nombre del grupo de gasto.
   - Luego, ingresa el monto del gasto.
   - Selecciona una categoría existente o crea una nueva para clasificar tu gasto.

2. **Quitar un gasto**:
   - Haz clic en "🗑️ Quitar Gasto".
   - Elige si deseas eliminar un gasto específico o un grupo completo.
   - Si eliges eliminar un gasto específico, ingresa el ID del grupo y luego el ID del gasto.

3. **Listar gastos**:
   - Haz clic en "📊 Listar Gastos" para ver todos tus gastos registrados.
   - El bot mostrará una lista con los detalles de cada gasto, incluyendo el grupo y la categoría.

4. **Exportar gastos**:
   - Haz clic en "📤 Exportar Gastos" para generar un archivo Excel con tus gastos.
   - El archivo se enviará a tu chat y se eliminará automáticamente después de ser enviado.

5. **Ver saldo**:
   - Haz clic en "💰 Ver Saldo" para conocer tu saldo actual.
   - El bot calculará y mostrará tu saldo basado en los gastos registrados.

6. **Gestionar grupos**:
   - Haz clic en "👥 Gestionar Grupos" para crear, cerrar o modificar grupos de gastos.
   - Puedes crear un nuevo grupo con el comando \`/creargrupogasto <NombreGrupo>\`.
   - Para cerrar un grupo, usa \`/cerrargrupogasto <IDGrupo>\`.

Si necesitas ayuda adicional, usa el comando /help para obtener más información sobre los comandos disponibles.

¡Espero que encuentres útil este bot para gestionar tus finanzas! 😊
`;

// Comando para mostrar el menú principal
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, welcomeMessage);
  bot.sendMessage(msg.chat.id, "¿Qué deseas hacer?", mainMenu);
});

// Manejador de callbacks para los botones
// Manejador de callbacks para los botones del menú principal
bot.on('callback_query', (callbackQuery) => {
  const action = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;

  bot.answerCallbackQuery(callbackQuery.id);

  switch(action) {
    case 'add_expense':
      bot.sendMessage(chatId, "Para añadir un gasto, usa el comando /anadirgasto seguido del nombre del grupo y el monto.");
      break;
    case 'remove_expense':
      quitargasto(chatId);
      break;
    case 'list_expenses':
      listarGastos({ chat: { id: chatId } });
      break;
    case 'export_expenses':
      exportarGastos(chatId, (filePath) => {
        bot.sendDocument(chatId, filePath).then(() => {
          fs.unlinkSync(filePath);
        });
      });
      break;
    case 'view_balance':
      bot.sendMessage(chatId, "para ver tu saldo, usa /versaldo");
      break;
    case 'manage_groups':
      bot.sendMessage(chatId, "Para gestionar grupos, usa los comandos /creargrupogasto, /cerrargrupogasto, o /modificargasto.");
      break;
    case 'help':
      bot.sendMessage(chatId, helpMessage);
      break;
  }
});

// Función para ver el saldo


const gastosEnProceso = new Map();

// Función principal para añadir gasto
function añadirgasto(msg) {
  const chatId = msg.chat.id;
  const iduser = msg.from.id;
  
  bot.sendMessage(chatId, "¿Cuál es el nombre del grupo de gasto?");
  bot.once('message', (msg) => {
    const nombre_grupo = msg.text;
    bot.sendMessage(chatId, "¿Cuál es el monto del gasto?");
    bot.once('message', (msg) => {
      const monto = parseFloat(msg.text);
      if (isNaN(monto)) {
        bot.sendMessage(chatId, "Por favor, ingresa un monto válido.");
        return;
      }
      
      gastosEnProceso.set(iduser, { nombre_grupo, monto });
      mostrarCategoriasOCrearNueva(chatId, iduser);
    });
  });
}

// Función para mostrar categorías o crear una nueva
function mostrarCategoriasOCrearNueva(chatId, iduser) {
  const queryCategorias = 'SELECT id_categoria, nombre_categoria FROM categorias';
  connection.query(queryCategorias, (err, categorias) => {
    if (err) {
      console.error('Error al obtener categorías:', err);
      bot.sendMessage(chatId, "Hubo un error al obtener las categorías. Por favor, intenta de nuevo más tarde.");
      return;
    }

    const inlineKeyboard = categorias.map(cat => [{text: cat.nombre_categoria, callback_data: `cat_${cat.id_categoria}`}]);
    inlineKeyboard.push([{text: "Crear nueva categoría", callback_data: "nueva_categoria"}]);
    
    bot.sendMessage(chatId, "Selecciona una categoría o crea una nueva:", {
      reply_markup: JSON.stringify({
        inline_keyboard: inlineKeyboard
      })
    });
  });
}

// Función para crear una nueva categoría
function crearNuevaCategoria(chatId, iduser) {
  bot.sendMessage(chatId, "Por favor, ingresa el nombre de la nueva categoría:");
  bot.once('message', (msg) => {
    const nombreCategoria = msg.text;
    const queryNuevaCategoria = 'INSERT INTO categorias (nombre_categoria) VALUES (?)';
    connection.query(queryNuevaCategoria, [nombreCategoria], (err, result) => {
      if (err) {
        console.error('Error al crear nueva categoría:', err);
        bot.sendMessage(chatId, "Hubo un error al crear la nueva categoría. Por favor, intenta de nuevo más tarde.");
      } else {
        const nuevaCategoria = {
          id: result.insertId,
          nombre: nombreCategoria
        };
        bot.sendMessage(chatId, `Nueva categoría "${nombreCategoria}" creada con éxito.`);
        const gastoEnProceso = gastosEnProceso.get(iduser);
        if (gastoEnProceso) {
          insertarGasto(chatId, iduser, gastoEnProceso.nombre_grupo, gastoEnProceso.monto, nuevaCategoria.id);
          gastosEnProceso.delete(iduser);
        } else {
          bot.sendMessage(chatId, "Hubo un error al procesar tu gasto. Por favor, intenta de nuevo.");
        }
      }
    });
  });
}

// Función para insertar el gasto en la base de datos
function insertarGasto(chatId, iduser, nombre_grupo, monto, id_categoria) {
  const queryGrupo = 'INSERT INTO MasterGrupoGastos (idchat, iduser, nombre_grupo, fecha_inicio, gasto_cerrado) VALUES (?, ?, ?, CURDATE(), ?)';
  connection.query(queryGrupo, [chatId, iduser, nombre_grupo, false], (err, results) => {
    if (err) {
      bot.sendMessage(chatId, 'Error añadiendo el grupo de gasto.');
      console.error(err);
    } else {
      const idgrupo_gasto = results.insertId;

      const queryGasto = 'INSERT INTO gastos (idchat, iduser, idgrupo_gasto, monto, gasto_saldado, id_categoria) VALUES (?, ?, ?, ?, ?, ?)';
      connection.query(queryGasto, [chatId, iduser, idgrupo_gasto, monto, false, id_categoria], (err, results) => {
        if (err) {
          bot.sendMessage(chatId, 'Error añadiendo gasto.');
          console.error(err);
        } else {
          bot.sendMessage(chatId, `Gasto añadido: Monto ${monto}, Grupo: ${nombre_grupo}, Categoría ID: ${id_categoria}`);
        }
      });
    }
  });
}

// Manejador global de callback_query
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const iduser = callbackQuery.from.id;
  const data = callbackQuery.data;
  const gastoEnProceso = gastosEnProceso.get(iduser);

  bot.answerCallbackQuery(callbackQuery.id);

  if (data === "nueva_categoria") {
    crearNuevaCategoria(chatId, iduser);
  } else if (data.startsWith("cat_")) {
    const categoriaId = parseInt(data.split('_')[1]);
    if (gastoEnProceso) {
      insertarGasto(chatId, iduser, gastoEnProceso.nombre_grupo, gastoEnProceso.monto, categoriaId);
      gastosEnProceso.delete(iduser);
    } else {
      bot.sendMessage(chatId, "Hubo un error al procesar tu gasto. Por favor, intenta de nuevo.");
    }
  }
});

// Comando para añadir gasto
bot.onText(/\/anadirgasto/, (msg) => {
  añadirgasto(msg);
});

// Manejo de callback_query
// Manejo de callback_query del /start
bot.on('callback_query', (callbackQuery) => {
  const message = callbackQuery.message;
  const chatId = message.chat.id;
  const data = callbackQuery.data;



  if (data === 'add_expense') {
    bot.sendMessage(chatId, 'Has seleccionado "Añadir Gasto". Por favor, ingresa los detalles del gasto con el siguiente formato : NombreGrupo, monto.');
    bot.once('message', (msg) => {
      const match = msg.text.match(/(\w+) (\d+(\.\d{1,2})?)/);
      if (match) {
        añadirgasto(msg, match);
      } else {
        bot.sendMessage(chatId, 'Formato incorrecto. Por favor, usa el formato: NombreGrupo Monto');
        bot.once('message', (msg) => {
          const match = msg.text.match(/(\w+) (\d+(\.\d{1,2})?)/);
          if (match) {
            añadirgasto(msg, match);
          } else {
            bot.sendMessage(chatId, 'Formato incorrecto. Por favor, Vuelve a intentarlo mas tarde');

          }
        });
      }
    });
  }  else if (data === 'list_expenses') {
    listarGastos(message);
  }
  else if(data === 'especifico'){
    especificoM();
  }
  // Responder al callback para evitar que el botón quede en espera
  bot.answerCallbackQuery(callbackQuery.id);
});






// Comando /quitargasto
// Comando /quitargasto
bot.onText(/\/quitargasto/, (msg) => {
  const chatId = msg.chat.id;
  quitargasto(chatId);
});

function quitargasto(chatId) {
  bot.sendMessage(chatId, 'Has seleccionado "Quitar Gasto".');
  const inline_keyboard= {
    reply_markup: {
      inline_keyboard: [
        [
          { text: 'Eliminar gasto específico', callback_data: 'especifico' },
          { text: 'Eliminar grupo de gastos', callback_data: 'eliminar_grupo'}
        ]
      ]
    }
  };
  bot.sendMessage(chatId, 'Selecciona una opción:', inline_keyboard);
}

// Manejo de callback_query inlinekeyboard2
bot.on('callback_query', (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const data = callbackQuery.data;

  if (data === 'especifico') {
    especificoM(chatId);
  } else if (data === 'eliminar_grupo') {
    eliminarGrupoM(chatId);
  }
  // Responder al callback para evitar que el botón quede en espera
  bot.answerCallbackQuery(callbackQuery.id);
});


function especificoM(chatId) {
  bot.sendMessage(chatId,'Has seleccionado eliminar un gasto especifico dentro de un grupo de gastos\n');
//msg selecc especifico
  const queryEsp1 = 'SELECT nombre_grupo, idgrupo_gasto FROM MasterGrupoGastos WHERE idchat = ?';
  connection.query(queryEsp1, [chatId],(err, results) => {
    if (err) {
      bot.sendMessage(chatId, 'Error recuperando la lista de grupos de gastos.');
      console.error(err);
    } else {
      if (results.length > 0) {
        let msgEsp1 = 'Escribe el ID del grupo de gastos del que deseas eliminar un gasto específico:\n';
        results.forEach((grupo) => {
          msgEsp1 += `IDgrupo: ${grupo.idgrupo_gasto}, NombreGrupo: ${grupo.nombre_grupo}\n`;
        });
        bot.sendMessage(chatId, msgEsp1);
  }
  bot.once('message', (msg) => {
    const idgrupo_gasto = parseInt(msg.text);
    if (!isNaN(idgrupo_gasto)) {
      const queryGastos = 'SELECT idgasto, monto FROM gastos WHERE idgrupo_gasto = ?';
      connection.query(queryGastos, [idgrupo_gasto], (err, results) => {
        if (err) {
          bot.sendMessage(chatId, 'Error recuperando los gastos.');
          console.error(err);
          return;
        }

        if (results.length > 0) {
          let message = 'Selecciona un gasto enviando el ID correspondiente:\n';
          results.forEach((gasto) => {
            message += `ID: ${gasto.idgasto}, Monto: ${gasto.monto}\n`;
          });
          bot.sendMessage(chatId, message)
            .then(() => {
              bot.once('message', (msg) => {
                const idgasto = parseInt(msg.text);
                if (!isNaN(idgasto)) {
                  const query = 'DELETE FROM gastos WHERE idgasto = ?';
                  connection.query(query, [idgasto], (err, results) => {
                    if (err) {
                      bot.sendMessage(chatId, 'Error quitando gasto.');
                      console.error(err);
                    } else {
                      bot.sendMessage(chatId, `Gasto quitado: ID ${idgasto}`);
                    }
                  });
                } else {
                  bot.sendMessage(chatId, 'ID de gasto no válido.');
                }
              });
            });
        } else {
          bot.sendMessage(chatId, 'No hay gastos registrados para este grupo.');
        }
      });
    } else {
      bot.sendMessage(chatId, 'ID de grupo de gastos no válido.');
    }
  });
}
}
  )
    
      
    
}

//algor para mandar la lista de GruposMaster




// Función para eliminar un grupo de gastos junto con sus gastos
function eliminarGrupoM(chatId) {
  const queryElim = 'SELECT nombre_grupo, idgrupo_gasto FROM MasterGrupoGastos WHERE idchat = ?';
  connection.query(queryElim, [chatId], (err, results) => {
    if (err) {
      bot.sendMessage(chatId, 'Error recuperando la lista de grupos de gastos.');
      console.error(err);
    } else {
      if (results.length > 0) {
        let mensajeElimGrupo = 'Selecciona un grupo de gastos enviando el ID correspondiente:\n';
        results.forEach((grupo) => {
          mensajeElimGrupo += `IDgrupo: ${grupo.idgrupo_gasto}, NombreGrupo: ${grupo.nombre_grupo}\n`;
        });
        bot.sendMessage(chatId, mensajeElimGrupo)
      
    .then(() => {
      bot.once('message', (msg) => {
        const idgrupo_gasto = parseInt(msg.text);
        if (!isNaN(idgrupo_gasto)) {
          const queryEliminarGastos = 'DELETE FROM gastos WHERE idgrupo_gasto = ?';
          connection.query(queryEliminarGastos, [idgrupo_gasto], (err, results) => {
            if (err) {
              bot.sendMessage(chatId, 'Error eliminando los gastos del grupo.');
              console.error(err);
              return;
            }
            const queryEliminarGrupo = 'DELETE FROM MasterGrupoGastos WHERE idgrupo_gasto = ?';
            connection.query(queryEliminarGrupo, [idgrupo_gasto], (err, results) => {
              if (err) {
                bot.sendMessage(chatId, 'Error eliminando el grupo de gastos.');
                console.error(err);
              } else {
                bot.sendMessage(chatId, `Grupo de gastos eliminado: ID ${idgrupo_gasto}`);
              }
            });
          });
        } else {
          bot.sendMessage(chatId, 'ID de grupo de gastos no válido.');
        }
      });
    });
  }
  }
})
}

// Comando /listargastos
bot.onText(/\/listargastos/, (msg) => {
  listarGastos(msg);
});

function listarGastos(msg){
    const chatId = msg.chat.id;
    const query = `
      SELECT g.*, m.nombre_grupo, c.nombre_categoria 
      FROM gastos g
      JOIN MasterGrupoGastos m ON g.idgrupo_gasto = m.idgrupo_gasto
      LEFT JOIN categorias c ON g.id_categoria = c.id_categoria
      WHERE g.idchat = ?
    `;
    
    connection.query(query, [chatId], (err, results) => {
      if (err) {
        bot.sendMessage(chatId, 'Error recuperando los gastos.');
        console.error(err);
      } else {
        if (results.length > 0) {
          let message = 'Lista de gastos:\n';
          results.forEach((gasto) => {
            message += `- Grupo: ${gasto.nombre_grupo}, Monto: ${gasto.monto}, Categoría: ${gasto.nombre_categoria || 'Sin categoría'}\n`;
          });
          bot.sendMessage(chatId, message);
        } else {
          bot.sendMessage(chatId, 'No hay gastos registrados.');
        }
      }
    });
}

bot.onText(/^\/commands/, (msg) => {
  bot.getMyCommands().then(function (info) {
      console.log(info)
  });
});


// Comando /cerrargasto
bot.onText(/\/cerrargasto/, (msg) => {
  const chatId = msg.chat.id;
  cerrarGasto(chatId);
});

//CIERRE DE GASTO PERSONAL
function cerrarGasto(chatId) {
  const query = 'SELECT nombre_grupo, idgrupo_gasto FROM MasterGrupoGastos WHERE idchat = ? AND gasto_cerrado = false';
  connection.query(query, [chatId], (err, results) => {
    if (err) {
      bot.sendMessage(chatId, 'Error recuperando la lista de grupos de gastos.');
      console.error(err);
      return;
    }

    if (results.length > 0) {
      let message = 'Grupos de gastos abiertos:\n';
      results.forEach((grupo) => {
        message += `ID: ${grupo.idgrupo_gasto}, Nombre: ${grupo.nombre_grupo}\n`;
      });
      message += '\nPor favor, ingresa el ID del grupo que deseas cerrar:';
      
      bot.sendMessage(chatId, message)
        .then(() => {
          bot.once('message', (msg) => {
            const idgrupo_gasto = parseInt(msg.text);
            if (!isNaN(idgrupo_gasto)) {
              const updateQuery = 'UPDATE MasterGrupoGastos SET gasto_cerrado = true WHERE idgrupo_gasto = ? AND idchat = ?';
              connection.query(updateQuery, [idgrupo_gasto, chatId], (err, result) => {
                if (err) {
                  bot.sendMessage(chatId, 'Error al cerrar el grupo de gastos.');
                  console.error(err);
                } else if (result.affectedRows > 0) {
                  bot.sendMessage(chatId, `Grupo de gastos con ID ${idgrupo_gasto} ha sido cerrado. Selecciona una opción:`, {
                    reply_markup: JSON.stringify({
                      inline_keyboard: [
                        [{ text: 'Exportar este grupo de gastos', callback_data: `export_group:${idgrupo_gasto}` }],
                        [{ text: 'Exportar y eliminar de la base de datos', callback_data: `export_delete_group:${idgrupo_gasto}` }],
                        [{ text: 'Eliminar grupo de gasto', callback_data: `delete_group:${idgrupo_gasto}` }],
                        [{ text: 'Omitir', callback_data: `skip_group:${idgrupo_gasto}` }]
                      ]
                    })
                  });
                } else {
                  bot.sendMessage(chatId, 'No se encontró el grupo de gastos especificado o ya estaba cerrado.');
                }
              });
            } else {
              bot.sendMessage(chatId, 'ID de grupo no válido. Por favor, ingresa un número.');
            }
          });
        });
    } else {
      bot.sendMessage(chatId, 'No hay grupos de gastos abiertos disponibles para cerrar.');
    }
  });
}

bot.onText(/\/modificargasto/, (msg) => {
  const chatId = msg.chat.id;
  modificarGasto(chatId);
})

// Modificar la función modificarGasto para verificar gasto_cerrado
function modificarGasto(chatId) {
  const query = 'SELECT nombre_grupo, idgrupo_gasto FROM MasterGrupoGastos WHERE idchat = ? AND gasto_cerrado = false';
  connection.query(query, [chatId], (err, results) => {
    if (err) {
      bot.sendMessage(chatId, 'Error recuperando la lista de grupos de gastos.');
      console.error(err);
      return;
    }

    if (results.length > 0) {
      let message = 'Has seleccionado para agregar un gasto en un grupo de gastos ya creado.\n\nGrupos de gastos disponibles:\n';
      const keyboard = [];

      results.forEach((grupo) => {
        message += `ID: ${grupo.idgrupo_gasto}, Nombre: ${grupo.nombre_grupo}\n`;
        keyboard.push([{
          text: `${grupo.nombre_grupo} (ID: ${grupo.idgrupo_gasto})`,
          callback_data: `add_expense_to_group:${grupo.idgrupo_gasto}`
        }]);
      });

      const inlineKeyboardMarkup = {
        inline_keyboard: keyboard
      };

      bot.sendMessage(chatId, message, {
        reply_markup: JSON.stringify(inlineKeyboardMarkup)
      });
    } else {
      bot.sendMessage(chatId, 'No hay grupos de gastos abiertos disponibles.');
    }
  });
}

// Manejador para los callbacks del teclado inline
bot.on('callback_query', (callbackQuery) => {
  const action = callbackQuery.data.split(':')[0];
  const groupId = callbackQuery.data.split(':')[1];
  const chatId = callbackQuery.message.chat.id;

  bot.answerCallbackQuery(callbackQuery.id);

  switch(action) {
    case 'export_group':
      exportarGrupoGastos(chatId, groupId);
      break;
    
    case 'export_delete_group':
      exportarYEliminarGrupoGastos(chatId, groupId);
      break;
    
    case 'skip_group':
      bot.sendMessage(chatId, `Se ha omitido la exportación del grupo de gastos con ID ${groupId}.`);
      break;

    case 'delete_group':
      eliminarGrupoM(chatId);
      break;

    // ... otros casos existentes ...
  }
});



function exportarYEliminarGrupoGastos(chatId, groupId) {
  const query = `
    SELECT g.*, m.nombre_grupo 
    FROM gastos g 
    JOIN MasterGrupoGastos m 
    ON g.idgrupo_gasto = m.idgrupo_gasto 
    WHERE g.idchat = ? AND g.idgrupo_gasto = ?;
  `;

  connection.query(query, [chatId, groupId], (err, results) => {
    if (err) {
      console.error('Error recuperando los gastos:', err);
      bot.sendMessage(chatId, 'Hubo un error al exportar los gastos.');
      return;
    }

    if (results.length === 0) {
      bot.sendMessage(chatId, 'No hay gastos para exportar en este grupo.');
      return;
    }

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(results);
    xlsx.utils.book_append_sheet(wb, ws, 'Gastos');

    const filePath = `./gastos_grupo_${groupId}_${chatId}.xlsx`;
    xlsx.writeFile(wb, filePath);

    // Enviar el archivo a través del bot
    const options = {
      filename: `gastos_grupo_${groupId}.xlsx`,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    bot.sendDocument(chatId, filePath, {}, options)
      .then(() => {
        fs.unlinkSync(filePath); // Eliminar el archivo temporal después de enviarlo

        // *** Aquí es donde eliminamos las relaciones y el grupo ***
        const deleteRelacionesQuery = 'DELETE FROM GrupoGastoUsuarios WHERE id_grupo_gasto = ?';
        connection.query(deleteRelacionesQuery, [groupId], (deleteRelacionesErr) => {
          if (deleteRelacionesErr) {
            console.error('Error al eliminar las relaciones en GrupoGastoUsuarios:', deleteRelacionesErr);
            bot.sendMessage(chatId, 'El archivo fue exportado, pero hubo un error al eliminar las relaciones del grupo en la base de datos.');
            return;
          }

          const deleteGrupoQuery = 'DELETE FROM MasterGrupoGastos WHERE idgrupo_gasto = ?';
          connection.query(deleteGrupoQuery, [groupId], (deleteGrupoErr) => {
            if (deleteGrupoErr) {
              console.error('Error al eliminar el grupo de gastos:', deleteGrupoErr);
              bot.sendMessage(chatId, 'El archivo fue exportado, pero hubo un error al eliminar el grupo de la base de datos.');
            } else {
              bot.sendMessage(chatId, `El grupo de gastos con ID ${groupId} ha sido exportado y eliminado completamente de la base de datos.`);
            }
          });
        });
      })
      .catch((error) => {
        console.error('Error al enviar el archivo:', error);
        bot.sendMessage(chatId, 'Hubo un error al enviar el archivo exportado.');
      });
  });
}


function exportarGrupoGastos(chatId, groupId) {
  const query = 'SELECT g.*, m.nombre_grupo FROM gastos g JOIN MasterGrupoGastos m ON g.idgrupo_gasto = m.idgrupo_gasto WHERE g.idchat = ? AND g.idgrupo_gasto = ?';
  
  connection.query(query, [chatId, groupId], (err, results) => {
    if (err) {
      console.error('Error recuperando los gastos:', err);
      bot.sendMessage(chatId, 'Hubo un error al exportar los gastos.');
      return;
    }

    if (results.length === 0) {
      bot.sendMessage(chatId, 'No hay gastos para exportar en este grupo.');
      return;
    }

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(results);
    xlsx.utils.book_append_sheet(wb, ws, 'Gastos');

    const filePath = `./gastos_grupo_${groupId}_${chatId}.xlsx`;
    xlsx.writeFile(wb, filePath);

    bot.sendDocument(chatId, filePath).then(() => {
      fs.unlinkSync(filePath);
      bot.sendMessage(chatId, 'Exportación completada con éxito.');
    }).catch((error) => {
      console.error('Error al enviar el archivo:', error);
      bot.sendMessage(chatId, 'Hubo un error al enviar el archivo exportado.');
    });
  });
}

//HACER QUE EL METODO CERRARGASTO LE DE LA OPCION, POST EXPORTAR O NO EL GASTO, DE ELIMINAR EL GRUPO DE GASTO DE LA BASE DE DATOS



async function registrarUsuario(idTelegram, nombreUsuario) {
  return new Promise((resolve, reject) => {
    connection.query(
      'INSERT INTO usuarios (iduser, nombre_usuario) VALUES (?, ?) ON DUPLICATE KEY UPDATE nombre_usuario = ?',
      [idTelegram, nombreUsuario, nombreUsuario],
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
  });
}

async function almacenarInfoEncuesta(chatId, gastoId, pollId) {
  bot.on('poll_answer', async (pollAnswer) => {
    if (pollAnswer.poll_id === pollId && pollAnswer.option_ids[0] === 0) { // Selección: "Participar"
      const userId = pollAnswer.user.id;
      const userName = pollAnswer.user.username || `${pollAnswer.user.first_name} ${pollAnswer.user.last_name || ''}`.trim();

      console.log(`Registrando usuario: ${userName} (ID: ${userId}) en el grupo ${gastoId}`);

      try {
        // 1. Verifica e inserta el grupo (si es necesario)
        const grupoExiste = await new Promise((resolve, reject) => {
          connection.query(
            'SELECT 1 FROM MasterGrupoGastos WHERE idgrupo_gasto = ?',
            [gastoId],
            (err, results) => {
              if (err) reject(err);
              resolve(results.length > 0);
            }
          );
        });

        if (!grupoExiste) {
          throw new Error(`El grupo con ID ${gastoId} no existe en MasterGrupoGastos.`);
        }

        // 2. Verifica e inserta el usuario en MasterGrupoUser
        const usuarioExiste = await new Promise((resolve, reject) => {
          connection.query(
            'SELECT 1 FROM MasterGrupoUser WHERE idusuario_part = ?',
            [userId],
            (err, results) => {
              if (err) reject(err);
              resolve(results.length > 0);
            }
          );
        });

        if (!usuarioExiste) {
          await new Promise((resolve, reject) => {
            connection.query(
              'INSERT INTO MasterGrupoUser (idusuario_part, nombre_usuario) VALUES (?, ?)',
              [userId, userName],
              (err, result) => {
                if (err) reject(err);
                console.log(`Usuario ${userName} añadido a MasterGrupoUser.`);
                resolve();
              }
            );
          });
        }

        // 3. Inserta la relación en GrupoGastoUsuarios
        await new Promise((resolve, reject) => {
          connection.query(
            'INSERT INTO GrupoGastoUsuarios (id_grupo_gasto, id_usuario) VALUES (?, ?)',
            [gastoId, userId],
            (err, result) => {
              if (err) reject(err);
              console.log(`Relación grupo-usuario añadida: Grupo ${gastoId}, Usuario ${userName}`);
              resolve();
            }
          );
        });
      } catch (error) {
        console.error(`Error al registrar al usuario ${userName} en el grupo ${gastoId}:`, error);
      }
    }
  });

  // Cerrar encuesta automáticamente después de 5 minutos
  setTimeout(() => {
    bot.stopPoll(chatId, pollId, {}, (err) => {
      if (err) console.error(`Error al cerrar la encuesta ${pollId}:`, err);
      else console.log(`Encuesta ${pollId} cerrada automáticamente.`);
    });
  }, 5 * 60 * 1000);
}






process.on('uncaughtException', (err) => {
  console.error('Error no capturado:', err.message);
  console.error(err.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Promesa no manejada:', reason);
});


async function invitarAGastoGrupo(bot, chatId, gastoId) {
  const opcionesEncuesta = ['Participar', 'No participar'];
  const encuesta = await bot.sendPoll(chatId, `¿Quieres participar en el grupo de gastos?`, opcionesEncuesta, {
    is_anonymous: false, // Necesitamos saber quién responde
    allows_multiple_answers: false,
  });

  // Llama a almacenarInfoEncuesta para procesar respuestas en tiempo real
  almacenarInfoEncuesta(chatId, gastoId, encuesta.poll.id);
}


async function obtenerOCrearUsuario(idTelegram, nombreUsuario) {
  await registrarUsuario(idTelegram, nombreUsuario);
  return new Promise((resolve, reject) => {
    connection.query(
      'SELECT * FROM usuarios WHERE iduser = ?',
      [idTelegram],
      (err, results) => {
        if (err) reject(err);
        else resolve(results[0]);
      }
    );
  });
}

async function crearGastoGrupo(chatId, idTelegram, nombreUsuario, nombreGrupo) {
  const usuario = await obtenerOCrearUsuario(idTelegram, nombreUsuario);
  return new Promise((resolve, reject) => {
    connection.query(
      'INSERT INTO MasterGrupoGastos (idchat, iduser, nombre_grupo, fecha_inicio, gasto_cerrado) VALUES (?, ?, ?, CURDATE(), false)',
      [chatId, usuario.iduser, nombreGrupo], // Cambio aquí: usuario.iduser
      (err, result) => {
        if (err) reject(err);
        else resolve(result.insertId);
      }
    );
  });
}


async function anadirGastoAlGrupo(chatId,gastoId, idTelegram, monto) {
  return new Promise((resolve, reject) => {
    connection.query(
      'INSERT INTO gastos (idchat,idgrupo_gasto, iduser, monto, fechaGasto, gasto_saldado) VALUES (?, ?, ?, ?, CURDATE(), false)',
      [chatId,gastoId, idTelegram, monto],
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
  });
}

// Actualizar los manejadores de comandos
bot.onText(/\/creargrupogasto (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const idTelegram = msg.from.id;
  const nombreUsuario = msg.from.username || `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();
  const nombreGrupo = match[1];

  try {
    const gastoId = await crearGastoGrupo(chatId, idTelegram, nombreUsuario, nombreGrupo);
    await bot.sendMessage(chatId, `Grupo de gastos "${nombreGrupo}" creado. ID: ${gastoId}`);
    await invitarAGastoGrupo(bot, chatId, gastoId);
  } catch (error) {
    console.error('Error al crear el grupo de gastos:', error);
    await bot.sendMessage(chatId, 'Hubo un error al crear el grupo de gastos.');
  }
});

bot.onText(/\/agregargasto (\d+) (\d+(\.\d{1,2})?)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const idTelegram = msg.from.id;
  const nombreUsuario = msg.from.username || `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();
  const gastoId = parseInt(match[1]);
  const monto = parseFloat(match[2]);

  try {
    await obtenerOCrearUsuario(idTelegram, nombreUsuario);
    await anadirGastoAlGrupo(chatId,gastoId, idTelegram, monto);
    await bot.sendMessage(chatId, `Gasto de ${monto} añadido al grupo ${gastoId}`);
  } catch (error) {
    console.error('Error al añadir gasto al grupo:', error);
    await bot.sendMessage(chatId, 'Hubo un error al agregar el gasto al grupo.');
  }
});

// Nuevo comando para ver el saldo del usuario
bot.onText(/\/versaldo/, async (msg) => {
  const chatId = msg.chat.id;
  const idTelegram = msg.from.id;
  const nombreUsuario = msg.from.username || `${msg.from.first_name} ${msg.from.last_name || ''}`.trim();

  try {
    const usuario = await obtenerOCrearUsuario(idTelegram, nombreUsuario);
    await bot.sendMessage(chatId, `Tu saldo actual es: ${usuario.saldo}`);
  } catch (error) {
    console.error('Error al obtener el saldo:', error);
    await bot.sendMessage(chatId, 'Hubo un error al obtener tu saldo.');
  }
});

// Cerrar un gasto de grupo y calcular divisiones
async function cerrarYCalcularGastoGrupo(bot, chatId, gastoId, creadorId) {
  try {
    // Marcar el gasto como cerrado
    connection.query(
      'UPDATE MasterGrupoGastos SET gasto_cerrado = true WHERE idgrupo_gasto = ?',
      [gastoId],
      (err, result) => {
        if (err) throw err;
      }
    );

    // Obtener todos los gastos y participantes
    connection.query(
      'SELECT iduser, monto FROM gastos WHERE idgrupo_gasto = ?',
      [gastoId],
      (err, gastos) => {
        if (err) throw err;

        connection.query(
          `SELECT DISTINCT ggu.id_usuario, u.nombre_usuario
           FROM GrupoGastoUsuarios ggu
           JOIN Usuarios u ON ggu.id_usuario = u.iduser
           WHERE ggu.id_grupo_gasto = ?`,
          [gastoId],
          (err, participantes) => {
            if (err) throw err;

            // Calcular gasto total y promedio por persona
            const gastoTotal = gastos.reduce((suma, gasto) => suma + gasto.monto, 0);
            const gastoPromedio = gastoTotal / participantes.length;

            // Calcular saldos
            const saldos = {};
            participantes.forEach(participante => {
              saldos[participante.id_usuario] = 0;
            });

            gastos.forEach(gasto => {
              saldos[gasto.iduser] += gasto.monto - gastoPromedio;
            });

            // Calcular transferencias
            const transferencias = calcularTransferencias(saldos);

            // Enviar mensaje resumen con inline_keyboard
            let mensajeResumen = `Resumen de gastos para el grupo:\n`;
            mensajeResumen += `Total gastado: ${gastoTotal}\n`;
            mensajeResumen += `Promedio por persona: ${gastoPromedio}\n\n`;
            mensajeResumen += `Transferencias necesarias:\n`;
            transferencias.forEach(transferencia => {
              mensajeResumen += `${transferencia.de} debe transferir ${transferencia.monto} a ${transferencia.para}\n`;
            });

            const opciones = {
              reply_markup: {
                inline_keyboard: [
                  [
                    {
                      text: 'Exportar y Eliminar Grupo',
                      callback_data: `exportar_eliminar_${gastoId}`
                    }
                  ]
                ]
              }
            };

            bot.sendMessage(chatId, mensajeResumen, opciones);
          }
        );
      }
    );
  } catch (error) {
    console.error('Error en cerrarYCalcularGastoGrupo:', error);
    bot.sendMessage(chatId, 'Hubo un error al cerrar y calcular el gasto de grupo.');
  }
}

// Manejador para el callback del botón
bot.on('callback_query', async (query) => {
  const userId = query.from.id;
  const data = query.data;
  const chatId = query.message.chat.id;

  if (data.startsWith('exportar_eliminar_')) {
    const gastoId = parseInt(data.split('_')[2]);

    try {
      // Verificar si el usuario es el creador del grupo
      const [result] = await new Promise((resolve, reject) => {
        connection.query(
          'SELECT iduser FROM MasterGrupoGastos WHERE idgrupo_gasto = ?',
          [gastoId],
          (err, results) => {
            if (err) reject(err);
            else resolve(results);
          }
        );
      });

      if (!result) {
        bot.answerCallbackQuery(query.id, { text: 'Grupo no encontrado.', show_alert: true });
        return;
      }

      const creadorId = result.iduser;

      if (userId === creadorId) {
        bot.answerCallbackQuery(query.id, { text: 'Grupo exportado y eliminado.' });
        exportarYEliminarGrupoGastos(chatId, gastoId);
      } else {
        bot.answerCallbackQuery(query.id, { text: 'Solo el creador del grupo puede realizar esta acción.', show_alert: true });
      }
    } catch (error) {
      console.error('Error al verificar creador del grupo:', error);
      bot.answerCallbackQuery(query.id, { text: 'Hubo un error al procesar tu solicitud.', show_alert: true });
    }
  } else {
    bot.answerCallbackQuery(query.id).catch((err) => {
      console.error('Error al responder al callback:', err);
    });
  }
});

// Función auxiliar para calcular transferencias
function calcularTransferencias(saldos) {
  const transferencias = [];
  const deudores = Object.entries(saldos).filter(([_, saldo]) => saldo < 0);
  const acreedores = Object.entries(saldos).filter(([_, saldo]) => saldo > 0);

  deudores.sort((a, b) => a[1] - b[1]);
  acreedores.sort((a, b) => b[1] - a[1]);

  let i = 0, j = 0;
  while (i < deudores.length && j < acreedores.length) {
    const [idDeudor, saldoDeudor] = deudores[i];
    const [idAcreedor, saldoAcreedor] = acreedores[j];

    const montoTransferencia = Math.min(-saldoDeudor, saldoAcreedor);
    transferencias.push({
      de: idDeudor,
      para: idAcreedor,
      monto: montoTransferencia
    });

    deudores[i][1] += montoTransferencia;
    acreedores[j][1] -= montoTransferencia;

    if (deudores[i][1] === 0) i++;
    if (acreedores[j][1] === 0) j++;
  }

  return transferencias;
}

bot.onText(/\/cerrargrupogasto (\d+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const gastoId = parseInt(match[1]);

  try {
    await cerrarYCalcularGastoGrupo(bot, chatId, gastoId);
  } catch (error) {
    console.error('Error al cerrar el grupo de gastos:', error);
    await bot.sendMessage(chatId, 'Hubo un error al cerrar el grupo de gastos.');
  }
});




bot.onText(/\/merval/, async (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, '📊 Buscando información sobre las acciones y ETFs...');

  try {
    // Define símbolos de acciones argentinas y ETFs internacionales
    const symbols = [
      'GGAL.BA', 'PAMP.BA', 'YPF.BA', 'CRES.BA', 'ALUA.BA', 'TGSU2.BA', // Acciones argentinas
      'SPY', 'DIA', 'XLE', 'QQQ' // ETFs: S&P 500, Dow Jones, Energía, Nasdaq 100
    ];

    // Obtén las cotizaciones de todos los símbolos
    const results = await yahooFinance.quote(symbols);

    // Construir mensaje principal
    let responseMessage = `📈 **Acciones del MERVAL y ETFs Internacionales**\n\n`;

    results.forEach((stock) => {
      const yahooFinanceUrl = `https://finance.yahoo.com/quote/${stock.symbol}`;
      responseMessage += `🟢 [${stock.symbol}](${yahooFinanceUrl})\n`; // Enlace directo a Yahoo Finance
      responseMessage += `- Precio actual: $${stock.regularMarketPrice.toFixed(2)}\n`;
      responseMessage += `- Cambio Diario: ${stock.regularMarketChangePercent.toFixed(2)}%\n\n`;
    });

    bot.sendMessage(chatId, responseMessage, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true // Para evitar que Telegram muestre una vista previa del enlace
    });

  } catch (error) {
    console.error('Error al procesar datos:', error);
    bot.sendMessage(chatId, '⚠️ Hubo un error al obtener los datos. Por favor, inténtalo más tarde.');
  }
});

// Manejo de callback para obtener detalles de un activo
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;

  if (data.startsWith('details_')) {
    const symbol = data.split('_')[1];

    try {
      const stockDetails = await yahooFinance.quote(symbol);

      let detailsMessage = `📊 **Detalles de ${symbol}**\n`;
      detailsMessage += `- Precio actual: $${stockDetails.regularMarketPrice.toFixed(2)}\n`;
      detailsMessage += `- Cambio Diario: ${stockDetails.regularMarketChangePercent.toFixed(2)}%\n`;
      detailsMessage += `- Máximo diario: $${stockDetails.regularMarketDayHigh.toFixed(2)}\n`;
      detailsMessage += `- Mínimo diario: $${stockDetails.regularMarketDayLow.toFixed(2)}\n`;
      detailsMessage += `- Volumen: ${stockDetails.regularMarketVolume.toLocaleString()}\n`;
      detailsMessage += `- Capitalización de mercado: $${stockDetails.marketCap.toLocaleString()}\n\n`;

      const yahooFinanceUrl = `https://finance.yahoo.com/quote/${symbol}`;

      bot.sendMessage(chatId, detailsMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: 'Abrir en Yahoo Finance',
              url: yahooFinanceUrl
            }
          ]]
        }
      });
    } catch (error) {
      console.error('Error al obtener detalles del activo:', error);
      bot.sendMessage(chatId, `⚠️ No se pudo obtener información adicional para ${symbol}.`);
    }
  }

  bot.answerCallbackQuery(callbackQuery.id); // Responder al callback para evitar errores
});

bot.onText(/\/agregarcategoria (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const nombreCategoria = match[1];
  
  const query = 'INSERT INTO categorias (nombre_categoria) VALUES (?)';
  connection.query(query, [nombreCategoria], (err, result) => {
    if (err) {
      bot.sendMessage(chatId, 'Error al añadir la categoría.');
    } else {
      bot.sendMessage(chatId, `Categoría "${nombreCategoria}" añadida con éxito.`);
    }
  });
});

bot.onText(/\/listarcategorias/, (msg) => {
  const chatId = msg.chat.id;
  
  const query = 'SELECT * FROM categorias';
  connection.query(query, (err, results) => {
    if (err) {
      bot.sendMessage(chatId, 'Error al listar las categorías.');
    } else {
      let message = 'Categorías disponibles:\n';
      results.forEach(cat => {
        message += `${cat.id_categoria}. ${cat.nombre_categoria}\n`;
      });
      bot.sendMessage(chatId, message);
    }
  });
});






// ... (código existente) ...

// Función para obtener los gastos por categoría
function obtenerGastosPorCategoria(chatId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT c.nombre_categoria, SUM(g.monto) as total_gasto
      FROM gastos g
      JOIN categorias c ON g.id_categoria = c.id_categoria
      WHERE g.idchat = ?
      GROUP BY c.id_categoria, c.nombre_categoria
    `;
    connection.query(query, [chatId], (err, results) => {
      if (err) {
        reject(err);
      } else {
        resolve(results);
      }
    });
  });
}

// Función para crear el gráfico circular
async function crearGraficoCircular(data) {
  const chart = new ChartJsImage();
  chart.setConfig({
    type: 'pie',
    data: {
      labels: data.map(item => item.nombre_categoria),
      datasets: [{
        data: data.map(item => item.total_gasto),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF',
          '#FF9F40', '#FF6384', '#C9CBCF', '#7BC225', '#51C4D3'
        ]
      }]
    },
    options: {
      plugins: {
        legend: {
          position: 'bottom',
        },
        title: {
          display: true,
          text: 'Distribución de Gastos por Categoría'
        }
      }
    }
  });

  chart.setWidth(400);
  chart.setHeight(400);

  return await chart.toBinary();
}

// Comando para generar y enviar el gráfico circular
bot.onText(/\/graficogastos/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    const gastosPorCategoria = await obtenerGastosPorCategoria(chatId);
    
    if (gastosPorCategoria.length === 0) {
      bot.sendMessage(chatId, "No hay gastos registrados para generar el gráfico.");
      return;
    }

    const imageBuffer = await crearGraficoCircular(gastosPorCategoria);
    
    bot.sendPhoto(chatId, imageBuffer, {
      caption: "Aquí tienes el gráfico circular de tus gastos por categoría."
    });
  } catch (error) {
    console.error('Error al generar el gráfico:', error);
    bot.sendMessage(chatId, "Hubo un error al generar el gráfico. Por favor, intenta de nuevo más tarde.");
  }
});

// ... (resto del código existente) ...



// Comando para convertir divisas
bot.onText(/\/convertir(?:\s+(\d+(\.\d{1,2})?)\s+(\w{3})\s+a\s+(\w{3}))?/, async (msg, match) => {
  const chatId = msg.chat.id;

  if (!match[1]) {
    // Listado limitado de monedas con su formato
    const currencies = [
      "USD (Dólar - Estados Unidos)",
      "EUR (Euro - Unión Europea)",
      "JPY (Yen - Japón)",
      "GBP (Libra Esterlina - Reino Unido)",
      "ARS (Peso - Argentina)",
      "BRL (Real - Brasil)",
      "CLP (Peso - Chile)",
      "COP (Peso - Colombia)",
      "PEN (Sol - Perú)",
      "PYG (Guaraní - Paraguay)",
      "UYU (Peso - Uruguay)",
      "VES (Bolívar - Venezuela)",
      "BOB (Boliviano - Bolivia)",
      "GYD (Dólar - Guyana)"
    ];

    // Mensaje de formato y monedas disponibles
    bot.sendMessage(chatId, `💱 Usa el comando con este formato:\n\n` +
      `\`/convertir <monto> <moneda_origen> a <moneda_destino>\`\n\n` +
      `Ejemplo: \`/convertir 100 USD a ARS\`\n\n` +
      `💡 Monedas disponibles:\n${currencies.join("\n")}`, { parse_mode: "Markdown" });
    return;
  }

  const monto = parseFloat(match[1]);
  const monedaOrigen = match[3].toUpperCase();
  const monedaDestino = match[4].toUpperCase();

  bot.sendMessage(chatId, `💱 Calculando la conversión de ${monto} ${monedaOrigen} a ${monedaDestino}...`);

  try {
    const response = await axios.get(`https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/latest/${monedaOrigen}`);
    const tasas = response.data.conversion_rates;

    if (!tasas[monedaDestino]) {
      bot.sendMessage(chatId, `⚠️ No se encontró la tasa de cambio para ${monedaDestino}.`);
      return;
    }

    const tasaCambio = tasas[monedaDestino];
    const montoConvertido = (monto * tasaCambio).toFixed(2);

    bot.sendMessage(
      chatId,
      `✅ **Conversión realizada:**\n` +
      `- Monto original: ${monto} ${monedaOrigen}\n` +
      `- Monto convertido: ${montoConvertido} ${monedaDestino}\n` +
      `- Tasa de cambio: 1 ${monedaOrigen} = ${tasaCambio} ${monedaDestino}`
    );
  } catch (error) {
    console.error('Error al consultar la API de tasas de cambio:', error);
    bot.sendMessage(chatId, '⚠️ Hubo un problema al obtener la tasa de cambio. Por favor, intenta más tarde.');
  }
});

