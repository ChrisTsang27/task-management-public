// Script to create sample tasks for different teams
// Run this with: node create-sample-tasks.js

const sampleTasks = [
  {
    title: "Setup Development Environment",
    description: "Configure local development environment for new team members",
    team: "IT Team",
    priority: "high",
    status: "in_progress"
  },
  {
    title: "Database Backup Automation",
    description: "Implement automated daily database backups",
    team: "IT Team",
    priority: "medium",
    status: "awaiting_approval"
  },
  {
    title: "Q4 Sales Report",
    description: "Prepare comprehensive Q4 sales performance report",
    team: "Sales Team",
    priority: "high",
    status: "pending_review"
  },
  {
    title: "Lead Generation Campaign",
    description: "Launch new lead generation campaign for enterprise clients",
    team: "Sales Team",
    priority: "medium",
    status: "approved"
  },
  {
    title: "Brand Guidelines Update",
    description: "Update brand guidelines to reflect new company direction",
    team: "Marketing Team",
    priority: "medium",
    status: "in_progress"
  },
  {
    title: "Social Media Strategy",
    description: "Develop comprehensive social media strategy for 2024",
    team: "Marketing Team",
    priority: "high",
    status: "awaiting_approval"
  },
  {
    title: "UI/UX Redesign",
    description: "Redesign main application interface for better user experience",
    team: "Design Team",
    priority: "high",
    status: "in_progress"
  },
  {
    title: "Design System Documentation",
    description: "Create comprehensive documentation for design system components",
    team: "Design Team",
    priority: "medium",
    status: "approved"
  },
  {
    title: "Employee Onboarding Process",
    description: "Streamline employee onboarding process and documentation",
    team: "HR Team",
    priority: "medium",
    status: "pending_review"
  },
  {
    title: "Performance Review System",
    description: "Implement new performance review system",
    team: "HR Team",
    priority: "high",
    status: "awaiting_approval"
  },
  {
    title: "Budget Planning 2024",
    description: "Prepare detailed budget plan for fiscal year 2024",
    team: "Finance Team",
    priority: "urgent",
    status: "in_progress"
  },
  {
    title: "Expense Tracking Automation",
    description: "Automate expense tracking and reporting processes",
    team: "Finance Team",
    priority: "medium",
    status: "approved"
  }
];

async function createSampleTasks() {
  try {
    // First, get all teams
    const teamsResponse = await fetch('http://localhost:3000/api/teams');
    const teamsData = await teamsResponse.json();
    const teams = teamsData.teams || [];
    
    console.log('Available teams:', teams.map(t => t.name));
    
    // Create tasks for each team
    for (const taskData of sampleTasks) {
      const team = teams.find(t => t.name === taskData.team);
      if (!team) {
        console.log(`Team "${taskData.team}" not found, skipping task: ${taskData.title}`);
        continue;
      }
      
      const task = {
        title: taskData.title,
        description_json: {
          type: 'doc',
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: taskData.description
            }]
          }]
        },
        team_id: team.id,
        priority: taskData.priority,
        status: taskData.status,
        is_request: false
      };
      
      const response = await fetch('http://localhost:3000/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(task)
      });
      
      if (response.ok) {
        console.log(`✓ Created task: ${taskData.title} (${taskData.team})`);
      } else {
        const error = await response.text();
        console.log(`✗ Failed to create task: ${taskData.title} - ${error}`);
      }
    }
    
    console.log('\n✅ Sample tasks creation completed!');
    console.log('You can now test the team filtering functionality in the application.');
    
  } catch (error) {
    console.error('Error creating sample tasks:', error);
  }
}

// Run the script
createSampleTasks();