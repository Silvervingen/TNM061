/*
 * A C++ framework for OpenGL programming in TNM061 for MT1 2014.
 *
 * This is a small, limited framework, designed to be easy to use
 * for students in an introductory computer graphics course in
 * the second year of a M Sc curriculum. It uses custom code
 * for some things that are better solved by external libraries
 * like GLEW and GLM, but the emphasis is on simplicity and
 * readability, not generality.
 * For the window management, GLFW 3.0 is used for convenience.
 * The framework should work in Windows, MacOS X and Linux.
 * Some Windows-specific stuff for extension loading is still
 * here. GLEW could have been used instead, but for clarity
 * and minimal dependence on other code, we rolled our own extension
 * loading for the things we need. That code is short-circuited on
 * platforms other than Windows. This code is dependent only on
 * the GLFW and OpenGL libraries. OpenGL 3.3 or higher is required.
 *
 * Author: Stefan Gustavson (stegu@itn.liu.se) 2013-2014
 * updated 2021 by Martin Falk (martin.falk@liu.se)
 *
 * This code is in the public domain.
 */
#if defined(WIN32) && !defined(_USE_MATH_DEFINES)
#define _USE_MATH_DEFINES
#endif

// System utilities
#include <iostream>
#include <cstdlib>
#include <cmath>

#include <GL/glew.h>
// GLFW 3.x, to handle the OpenGL window
#include <GLFW/glfw3.h>

// Headers for the other source files that make up this program.
#include "util/tnm061.hpp"
#include "util/Shader.hpp"
#include "util/Texture.hpp"
#include "util/TriangleSoup.hpp"
#include "util/Rotator.hpp"
#include "util/MatrixStack.hpp"

/*
 * setupViewport() - set up the OpenGL viewport.
 * This should be done for each frame, to handle window resizing.
 * The "proper" way would be to set a "resize callback function"
 * using glfwSetWindowSizeCallback() and do these few operations
 * only when something changes, but let's keep it simple.
 * Besides, we want to change P when the aspect ratio changes.
 * A callback function would require P to be changed indirectly
 * in some manner, which is somewhat awkward in this case.
 */
void setupViewport(GLFWwindow* window, GLfloat* P) {

    int width, height;

    // Get window size. It may start out different from the requested
    // size, and will change if the user resizes the window.
    glfwGetWindowSize(window, &width, &height);

    // Ugly hack: adjust perspective matrix for non-square aspect ratios
    P[0] = P[5] * height / width;

    // Set viewport. This is the pixel rectangle we want to draw into.
    glViewport(0, 0, width, height);  // The entire window
}

/*
 * main(int argc, char* rgv[]) - the standard C entry point for the program
 */
int main() {

    TriangleSoup earthSphere;
    Texture earthTexture;
    Shader earthShader;

	Texture sunTexture;
    Texture moonTexture;

    GLint location_time, location_MV, location_P, location_tex;  // Shader uniforms
    float time;
    double fps = 0.0;

    MatrixStack MVstack;  // The matrix stack we are going to use to set MV

    const GLFWvidmode* vidmode;  // GLFW struct to hold information about the display
    GLFWwindow* window;          // GLFW struct to hold information about the window

    MouseRotator rotator;

    // Initialise GLFW
    glfwInit();

    // Determine the desktop size
    vidmode = glfwGetVideoMode(glfwGetPrimaryMonitor());

    // Make sure we are getting a GL context of at least version 3.3
    glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3);
    glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
    // Exclude old legacy cruft from the context. We don't need it, and we don't want it.
    glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
    glfwWindowHint(GLFW_OPENGL_FORWARD_COMPAT, GL_TRUE);

    // Open a square window (aspect 1:1) to fill half the screen height
    window = glfwCreateWindow(vidmode->height / 2, vidmode->height / 2,
                              "TNM061 Lab1: Hierarchical Transformations", NULL, NULL);
    if (!window) {
        glfwTerminate();  // No window was opened, so we can't continue in any useful way
        return -1;
    }

    // Make the newly created window the "current context" for OpenGL
    // (This step is strictly required, or things will simply not work)
    glfwMakeContextCurrent(window);

    GLenum err = glewInit();
    if (GLEW_OK != err) {
        std::cerr << "Error: " << glewGetErrorString(err) << "\n";
        glfwTerminate();
        return -1;
    }

    rotator.init(window);

    std::cout << "GL vendor:       " << glGetString(GL_VENDOR)
              << "\nGL renderer:     " << glGetString(GL_RENDERER)
              << "\nGL version:      " << glGetString(GL_VERSION)
              << "\nDesktop size:    " << vidmode->width << " x " << vidmode->height << "\n";

    glfwSwapInterval(0);  // Do not wait for screen refresh between frames

    // Perspective projection matrix
    // This is the standard gluPerspective() form of the
    // matrix, with d=4, near=3, far=7 and aspect=1.
    GLfloat P[16] = {4.0f, 0.0f, 0.0f,  0.0f,  0.0f, 4.0f, 0.0f,   0.0f,
                     0.0f, 0.0f, -2.5f, -1.0f, 0.0f, 0.0f, -10.5f, 0.0f};

    // Intialize the matrix to an identity transformation
    MVstack.init();

    // Create geometry for rendering
    earthSphere.createSphere(1.0, 30);
    // soupReadOBJ(&myShape, MESHFILENAME);
    earthSphere.printInfo();

    // Create a shader program object from GLSL code in two files
    earthShader.createShader("shaders/vertexshader.glsl", "shaders/fragmentshader.glsl");

    glEnable(GL_TEXTURE_2D);
    // Read the texture data from file and upload it to the GPU
    earthTexture.createTexture("textures/earth.tga");
    sunTexture.createTexture("textures/sun.tga");
    moonTexture.createTexture("textures/moon.tga");

    location_MV = glGetUniformLocation(earthShader.programID, "MV");
    location_P = glGetUniformLocation(earthShader.programID, "P");
    location_time = glGetUniformLocation(earthShader.programID, "time");
    location_tex = glGetUniformLocation(earthShader.programID, "tex");

    // Main loop
    while (!glfwWindowShouldClose(window)) {
        // Calculate and update the frames per second (FPS) display
        fps = tnm061::displayFPS(window);

        // Set the clear color and depth, and clear the buffers for drawing
        glClearColor(0.3f, 0.3f, 0.3f, 0.0f);
        glClear(GL_COLOR_BUFFER_BIT | GL_DEPTH_BUFFER_BIT);

        glEnable(GL_DEPTH_TEST);  // Use the Z buffer
        glEnable(GL_CULL_FACE);   // Use back face culling
        glCullFace(GL_BACK);

        // Set up the viewport
        setupViewport(window, P);

        // Handle mouse input
        rotator.poll(window);
        // std::cout << "phi = " << rotator.phi << ", theta = " << rotator.theta << "\n";

        // Activate our shader program.
        glUseProgram(earthShader.programID);

        // Copy the projection matrix P into the shader.
        glUniformMatrix4fv(location_P, 1, GL_FALSE, P);

        // Tell the shader to use texture unit 0.
        glUniform1i(location_tex, 0);

        // Update the uniform time variable.
        time = (float)glfwGetTime();  // Needed later as well
        glUniform1f(location_time, time);

        // Draw the scene
        MVstack.push();  // Save the initial, untouched matrix

        // Modify MV according to user input
        // First, do the view transformations ("camera motion")
        MVstack.translate(0.0f, 0.0f, -5.0f);
        MVstack.rotX(rotator.theta);
        MVstack.rotY(rotator.phi);

        // Then, do the model transformations ("object motion")
        MVstack.push();  // Save the current matrix on the stack

        // Sun
        MVstack.rotY(time);
        MVstack.rotX(static_cast<float>(-M_PI_2));  // Orient the poles along Y axis instead of Z
        MVstack.scale(0.5f);                        // Scale unit sphere to radius 0.5
        // Update the transformation matrix in the shader
        glUniformMatrix4fv(location_MV, 1, GL_FALSE, MVstack.getCurrentMatrix());
        // Render the geometry to draw the sun
        glBindTexture(GL_TEXTURE_2D, sunTexture.texID);
        earthSphere.render();

        MVstack.pop();  // Restore the matrix we saved above

        // Earth
        MVstack.rotY(0.2f * time);            // Earth orbit rotation
        MVstack.translate(1.0f, 0.0f , 0.0f);  // Earth orbit radius
        MVstack.push();                       // Save the matrix before the Earth's rotation

        MVstack.rotY(5.0f * time);                 // Earth's rotation around its axis
        MVstack.rotX(static_cast<float>(-M_PI_2));  // Orient the poles along Y axis instead of Z
        MVstack.scale(0.1f);                        // Scale unit sphere to radius 0.1
        // Update the transformation matrix in the shader
        glUniformMatrix4fv(location_MV, 1, GL_FALSE, MVstack.getCurrentMatrix());
        // Render the geometry to draw the sun
        glBindTexture(GL_TEXTURE_2D, earthTexture.texID);
        earthSphere.render();

        MVstack.pop();  // Restore the matrix we saved above

        // Moon
        MVstack.push();                       // Save the matrix before the Moon's rotation
        MVstack.rotY(1.0f * time);            // Moon orbit rotation
        MVstack.translate(0.3f, 0.0f, 0.0f);  // Moon orbit radius

        MVstack.rotY(-1.0f * time);                   // Moons rotation around its axis
        MVstack.rotX(static_cast<float>(-M_PI_2));  // Orient the poles along Y axis instead of Z
        MVstack.scale(0.027);                         // Scale unit sphere to radius 0.05
        // Update the transformation matrix in the shader
        glUniformMatrix4fv(location_MV, 1, GL_FALSE, MVstack.getCurrentMatrix());
        // Render the geometry to draw the sun
        glBindTexture(GL_TEXTURE_2D, moonTexture.texID);
        earthSphere.render();

        MVstack.pop();  // Restore the matrix we saved above

        MVstack.pop();  // Restore the initial, untouched matrix

        // Play nice and deactivate the shader program
        glUseProgram(0);

        // Swap buffers, i.e. display the image and prepare for next frame.
        glfwSwapBuffers(window);

        // Poll events (read keyboard and mouse input)
        glfwPollEvents();

        // Exit if the ESC key is pressed (and also if the window is closed).
        if (glfwGetKey(window, GLFW_KEY_ESCAPE)) {
            glfwSetWindowShouldClose(window, GL_TRUE);
        }
    }

    // Close the OpenGL window and terminate GLFW.
    glfwDestroyWindow(window);
    glfwTerminate();
}
