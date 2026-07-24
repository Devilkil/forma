import React, { useState, useRef, useEffect } from "react";
import { Folder, ChevronDown, Check } from "lucide-react";
import type { Project } from "../../../shared/types";

interface ProjectDropdownProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
}

export function ProjectDropdown({
  projects,
  selectedProjectId,
  onSelectProject
}: ProjectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="project-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className="project-dropdown-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Move to project"
      >
        <Folder size={14} className="folder-icon" />
        <span className="dropdown-label">{selectedProject?.name || "Project"}</span>
        <ChevronDown size={14} className={`chevron-icon ${isOpen ? "open" : ""}`} />
      </button>

      {isOpen && (
        <div className="project-dropdown-menu">
          <div className="dropdown-menu-title">Move note to:</div>
          {projects.map((project) => {
            const isSelected = project.id === selectedProjectId;
            return (
              <button
                key={project.id}
                type="button"
                className={`project-dropdown-option ${isSelected ? "selected" : ""}`}
                onClick={() => {
                  onSelectProject(project.id);
                  setIsOpen(false);
                }}
              >
                <Folder size={14} className="option-icon" />
                <span className="option-name">{project.name}</span>
                {isSelected && <Check size={14} className="check-icon" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
