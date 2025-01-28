document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('userDataForm');
    const status = document.getElementById('status');

    chrome.storage.local.get('userData', (result) => {
        if (result.userData) {
            const userData = result.userData;
            document.getElementById('firstName').value = userData.firstName || '';
            document.getElementById('lastName').value = userData.lastName || '';
            document.getElementById('email').value = userData.email || '';
            document.getElementById('phoneNumber').value = userData.phoneNumber || '';
            document.getElementById('address').value = userData.address || '';
            document.getElementById('skills').value = userData.skills || '';

            // Load experiences
            if (userData.experiences) {
                userData.experiences.forEach(exp => {
                    addExperience(exp.companyName, exp.experienceDetails);
                });
            }

            // Load projects
            if (userData.projects) {
                userData.projects.forEach(proj => {
                    addProject(proj.projectName, proj.projectDetails);
                });
            }
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const userData = {
            firstName: form.firstName.value,
            lastName: form.lastName.value,
            email: form.email.value,
            phoneNumber: form.phoneNumber.value,
            address: form.address.value,
            skills: form.skills.value,
            experiences: [],
            projects: []
        };

        // Collect experiences
        document.querySelectorAll('#experiences .experience').forEach(expDiv => {
            const companyName = expDiv.querySelector('input[name="companyName"]').value;
            const experienceDetails = expDiv.querySelector('textarea[name="experienceDetails"]').value;
            userData.experiences.push({ companyName, experienceDetails });
        });

        // Collect projects
        document.querySelectorAll('#projects .project').forEach(projDiv => {
            const projectName = projDiv.querySelector('input[name="projectName"]').value;
            const projectDetails = projDiv.querySelector('textarea[name="projectDetails"]').value;
            userData.projects.push({ projectName, projectDetails });
        });

        chrome.storage.local.set({ userData }, () => {
            status.textContent = 'Data saved successfully!';
            setTimeout(() => (status.textContent = ''), 3000);
        });
    });

    document.getElementById('addExperienceBtn').addEventListener('click', () => {
        addExperience();
    });

    document.getElementById('addProjectBtn').addEventListener('click', () => {
        addProject();
    });

    function addExperience(companyName = '', experienceDetails = '') {
        const experiencesDiv = document.getElementById('experiences');
        const newExperienceDiv = document.createElement('div');
        newExperienceDiv.classList.add('experience');
        newExperienceDiv.innerHTML = `
            <label for="companyName">Company Name:</label>
            <input type="text" name="companyName" value="${companyName}">
            <label for="experienceDetails">Experience Details:</label>
            <textarea name="experienceDetails">${experienceDetails}</textarea>
        `;
        experiencesDiv.appendChild(newExperienceDiv);
    }

    function addProject(projectName = '', projectDetails = '') {
        const projectsDiv = document.getElementById('projects');
        const newProjectDiv = document.createElement('div');
        newProjectDiv.classList.add('project');
        newProjectDiv.innerHTML = `
            <label for="projectName">Project Name:</label>
            <input type="text" name="projectName" value="${projectName}">
            <label for="projectDetails">Project Details:</label>
            <textarea name="projectDetails">${projectDetails}</textarea>
        `;
        projectsDiv.appendChild(newProjectDiv);
    }
});