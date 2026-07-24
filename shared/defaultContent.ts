export const emptyBodyJson = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "paragraph"
    }
  ]
});

export const welcomeBodyJson = JSON.stringify({
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Welcome to Project Notes" }]
    },
    {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "Create projects, save rich notes, pin important ideas, and keep everything private on this computer."
        }
      ]
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Make your first project" }]
            }
          ]
        },
        {
          type: "taskItem",
          attrs: { checked: false },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Write a note worth returning to" }]
            }
          ]
        }
      ]
    }
  ]
});
